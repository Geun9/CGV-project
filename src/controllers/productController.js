const productService = require('../services/productService');
const { catchAsync } = require('../middlewares/error');

const getProductList = catchAsync(async (req, res) => {
  const { regionId, amenityId, themeId, orderBy, campName, limit, offset } =
    req.query;
  const userId = req.userId;

  const result = await productService.getProductList(
    userId,
    regionId,
    amenityId,
    themeId,
    orderBy,
    campName,
    limit,
    offset
  );
  return res.json({ result });
});

const getAllZoneByCampId = catchAsync(async (req, res) => {
  const { campId } = req.params;

  const result = await productService.getAllZoneByCampId(campId);

  if (!result.zoneInfo) {
    const error = new Error('INVALID_DATA');
    error.statusCode = 400;
    throw error;
  }

  return res.status(200).json({ message: 'GET SUCCESS', result });
});

const getAvailableCampingZone = catchAsync(async (req, res) => {
  const { campId, startDate, endDate } = req.query;

  if (endDate < startDate)
    return res.status(400).json({ message: 'INVALID_DATA' });

  const unavailableZone = await productService.getUnavailableCampingZone(
    campId,
    startDate,
    endDate
  );

  let unavailableZoneNames;
  if (unavailableZone.campingZones === null) unavailableZoneNames = '';
  else {
    unavailableZoneNames = unavailableZone.campingZones.map(
      (zoneNames) => zoneNames.zoneName
    );
  }

  const availableZone = await productService.getAvailableCampingZone(
    campId,
    unavailableZoneNames
  );

  return res.status(200).json({
    unavailableZones: unavailableZone.campingZones,
    availableZones: availableZone.zoneInfo,
  });
});

const getCampById = catchAsync(async (req, res) => {
  const {
    params: { campId },
  } = req;
  const campDetail = await productService.getCampById(campId);

  return res.status(200).json({ message: 'SUCCESS', data: campDetail });
});

const getRecommendedProducts = catchAsync(async (req, res) => {
  const result = await productService.getRecommendedProducts();
  return res.status(200).json({ result });
});

const getAllCategiries = catchAsync(async (req, res) => {
  const data = await productService.getAllCategiries();
  res.status(200).json({ data });
});

const uploadProfileImage = catchAsync(async (req, res) => {
  const userId = req.user;
  const profileImage = req.file;
  const result = await productService.uploadProfileImage(userId, profileImage);

  return res.status(200).json({ result });
});

module.exports = {
  getProductList,
  getAllZoneByCampId,
  getAvailableCampingZone,
  getCampById,
  getRecommendedProducts,
  getAllCategiries,
  uploadProfileImage,
};
