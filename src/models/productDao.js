const { dataSource } = require('./dataSource');
const queryBuilder = require('./queryBuilder');
const { reservationStatusEnum } = require('./enum');

const campList = async (
  userId,
  regionId,
  amenityId,
  themeId,
  orderBy,
  campName,
  limit,
  offset
) => {
  try {
    const existuserId = userId
      ? `,
      IF(
      (SELECT camp_id FROM wishlists WHERE camp_id = c.id AND user_id = ${userId}) IS NULL,
      NULL,
      true
    ) AS wishedCamp`
      : '';

    const baseQuery = `
  SELECT DISTINCT
      c.id,
      c.campsite_name,
      c.price,
      c.address,
      c.thumbnail,
      r.region_name,
      c.longitude,
      c.latitude,
  GROUP_CONCAT(DISTINCT a.amenity_name SEPARATOR ',') AS amenity,
      t.theme,
  COUNT(w.id) AS wishlist_count${existuserId}
  FROM camps AS c
  JOIN regions AS r ON c.region_id = r.id
  JOIN camps_amenities AS ca ON c.id = ca.camp_id
  JOIN amenities AS a ON a.id = ca.amenity_id
  JOIN themes AS t ON c.theme_id = t.id
  LEFT JOIN wishlists AS w ON c.id = w.camp_id
        `;

    const whereCondition = queryBuilder.getFiltering({
      userId: userId,
      regionId: regionId,
      themeId: themeId,
      amenityId: amenityId,
      campName: campName,
    });
    const sortQuery = queryBuilder.getOrdering(orderBy);
    const limitQuery = queryBuilder.getLimit(limit, offset);
    const makeArray = queryBuilder.isArray(amenityId);
    const groupCondition = `GROUP BY c.id`;
    const havingCondition = amenityId
      ? `HAVING COUNT(DISTINCT ca.amenity_id) = ${makeArray.length}`
      : '';

    const result = await dataSource.query(
      `${baseQuery} ${whereCondition} ${groupCondition} ${havingCondition} ${sortQuery} ${limitQuery}`
    );
    return result;
  } catch (error) {
    error = new Error('INVALID_DATA');
    error.statusCode = 400;
    throw error;
  }
};

const allCampingZoneQuery = `SELECT
JSON_ARRAYAGG(
   JSON_OBJECT(
    "campId", c.id,
     "campingZoneId", cz.id,
     "zoneName", cz.zone_name,
     "additionalPrice", zso.additional_price,
     "maxPeople", zso.max_people,
     "coordinates", 
       JSON_OBJECT(
         "x1", cz.x1,
         "x2", cz.x2,
         "x3", cz.x3,
         "x4", cz.x4,
         "y1", cz.y1,
         "y2", cz.y2,
         "y3", cz.y3,
         "y4", cz.y4 
       )
      ) 
    ) zoneInfo
    FROM camps c
    JOIN camping_zones cz ON c.id = cz.camp_id
    JOIN zone_size_options zso ON zso.id = cz.zone_size_option_id`;

const getAllZoneByCampId = async (campId) => {
  try {
    const [result] = await dataSource.query(
      `${allCampingZoneQuery}
      WHERE cz.camp_id = ?`,
      [campId]
    );
    return result;
  } catch (error) {
    error = new Error('INVALID_DATA');
    error.statusCode = 400;
    throw error;
  }
};

const campingZoneQuery = `SELECT
  JSON_ARRAYAGG(
    JSON_OBJECT(
      "campId", c.id,
      "campingZoneId", cz.id,
      "reservationId", r.id,
      "zoneName", cz.zone_name,
      "startDate", r.start_date,
      "endDate", r.end_date,
      "additionalPrice", zso.additional_price,
      "maxPeople", zso.max_people,
      "coordinates", 
      JSON_OBJECT(
        "x1", cz.x1,
        "x2", cz.x2,
        "x3", cz.x3,
        "x4", cz.x4,
        "y1", cz.y1,
        "y2", cz.y2,
        "y3", cz.y3,
        "y4", cz.y4 
      )
    )
  )campingZones
FROM camps c
JOIN camping_zones cz ON c.id = cz.camp_id
JOIN zone_size_options zso ON cz.zone_size_option_id = zso.id
LEFT JOIN zones_reservations zr ON cz.id = zr.camping_zone_id
LEFT JOIN reservations r ON zr.reservation_id = r.id`;

const getUnavailableCampingZone = async (campId, startDate, endDate) => {
  try {
    const [unavailableZone] = await dataSource.query(
      `${campingZoneQuery} 
        WHERE (? < r.end_date AND r.start_date < ?)
        AND c.id = ?
        AND NOT r.reservation_status_id = ?`,
      [startDate, endDate, campId, reservationStatusEnum.CANCELLED]
    );
    return unavailableZone;
  } catch (error) {
    error = new Error('INVALID_DATA');
    error.statusCode = 400;
    throw error;
  }
};

const getAvailableCampingZone = async (campId, unavailableZoneNames) => {
  try {
    const [availableZone] = await dataSource.query(
      `${allCampingZoneQuery}
    WHERE c.id = ?
    AND NOT cz.zone_name IN (?)
  `,
      [campId, unavailableZoneNames]
    );
    return availableZone;
  } catch (error) {
    error = new Error('INVALID_DATA');
    error.statusCode = 400;
    throw error;
  }
};

const checkCampById = async (campId) => {
  try {
    const [camp] = await dataSource.query(
      `SELECT EXISTS(
        SELECT
          id
        FROM
          camps
        WHERE
          id = ?
      ) AS registered
      `,
      [campId]
    );
    return !!parseInt(camp.registered);
  } catch (error) {
    error = new Error('DATASOURCE ERROR');
    error.statusCode = 400;
    throw error;
  }
};

const getCampById = async (campId) => {
  try {
    const [data] = await dataSource.query(
      `SELECT
      c.id AS campId,
      c.campsite_name AS campName,
      c.address AS address,
      (SELECT JSON_ARRAYAGG(picture)
       FROM (
         SELECT DISTINCT cp.picture
         FROM camp_pictures cp
         INNER JOIN camps c ON cp.camp_id = c.id
         WHERE cp.camp_id = ?
       ) AS subquery) AS pictures,
      c.price AS price,
      c.description AS description,
      c.thumbnail AS thumbnail,
      (SELECT JSON_ARRAYAGG(amenity_name)
       FROM (
         SELECT DISTINCT a.amenity_name
         FROM camps_amenities ca
         INNER JOIN amenities a ON ca.amenity_id = a.id
         WHERE ca.camp_id = c.id
       ) AS subquery) AS amenities,
      t.theme AS theme,
      r.region_name AS region,
      c.check_in AS checkIn,
      c.check_out AS checkOut,
      c.view_map AS viewMap,
      c.latitude,
      c.longitude
    FROM camps c
    LEFT JOIN regions r ON r.id = c.region_id
    LEFT JOIN themes t ON c.theme_id = t.id
    LEFT JOIN camp_pictures cp ON cp.camp_id = c.id
    WHERE c.id = ?
    GROUP BY c.id
      `,
      [campId, campId]
    );
    return data;
  } catch (error) {
    error = new Error('DATASOURCE ERROR');
    error.statusCode = 400;
    throw error;
  }
};

const getRecommendedProducts = async () => {
  try {
    return dataSource.query(
      `
    SELECT
     c.id campId,
     c.campsite_name campsiteName,
     r.region_name regionName
    FROM camps c
    JOIN regions r ON r.id = c.region_id
    ORDER BY RAND() limit 1
    `
    );
  } catch (error) {
    error = new Error('DATASOURCE ERROR');
    error.statusCode = 400;
    throw error;
  }
};

const getAllCategiries = async () => {
  try {
    const result = await dataSource.query(
      `
      SELECT 
      (
          SELECT JSON_ARRAYAGG(
              JSON_OBJECT(
                  'region_id', id, 
                  'region_name', region_name,
                  'region_count', region_count
              )
          )
          FROM (
              SELECT
                  r.id AS id,
                  r.region_name AS region_name,
                  COUNT(*) AS region_count
              FROM camps AS c
              JOIN regions AS r ON c.region_id = r.id
              GROUP BY r.id, r.region_name
          ) AS region_subquery
      ) AS region_result,
      (
          SELECT JSON_ARRAYAGG(
              JSON_OBJECT(
                  'theme_id', id,
                  'theme_name', theme_name,
                  'theme_count', theme_count
              )
          )
          FROM (
              SELECT
                  t.id AS id,
                  t.theme AS theme_name,
                  COUNT(*) AS theme_count
              FROM camps AS c
              JOIN themes AS t ON c.theme_id = t.id
              GROUP BY t.id, t.theme
          ) AS theme_subquery
      ) AS theme_result,
      (
          SELECT JSON_ARRAYAGG(
              JSON_OBJECT(
                  'amenity_id', id,
                  'amenity_name', amenity_name,
                  'amenity_count', amenity_count
              )
          )
          FROM (
              SELECT
                  a.id AS id,
                  a.amenity_name AS amenity_name,
                  COUNT(*) AS amenity_count
              FROM camps AS c
              JOIN camps_amenities AS ca ON c.id = ca.camp_id
              JOIN amenities AS a ON ca.amenity_id = a.id
              GROUP BY a.id, a.amenity_name
          ) AS amenity_subquery
      ) AS amenity_result;  
`
    );
    return result;
  } catch (error) {
    error = new Error('DATASOURCE ERROR');
    error.statusCode = 400;
    throw error;
  }
};

const uploadProfileImage = async (userId, imageURL) => {
  const queryRunner = dataSource.createQueryRunner();

  await queryRunner.connect();

  await queryRunner.startTransaction();

  try {
    const result = await queryRunner.query(
      `UPDATE users
        set profile_image = ?
      WHERE id = ?
      `,
      [imageURL, userId]
    );

    if (result.affectedRows !== 1) throw new Error('INVALID_MODIFICATION');

    const modifyResult = await queryRunner.query(
      `SELECT
        name,
        profile_image
      FROM users
      WHERE id = ?
      `,
      [userId]
    );

    await queryRunner.commitTransaction();

    return modifyResult;
  } catch (error) {
    await queryRunner.rollbackTransaction();
    error = new Error('INVALID_DATA');
    error.statusCode = 400;
    throw error;
  } finally {
    await queryRunner.release();
  }
};

module.exports = {
  campList,
  getAllZoneByCampId,
  getAvailableCampingZone,
  getUnavailableCampingZone,
  checkCampById,
  getCampById,
  getRecommendedProducts,
  getAllCategiries,
  uploadProfileImage,
};
