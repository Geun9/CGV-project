const productDao = require('../models/productDao');
const upload = require('../utils/imageUpload');

const getProductList = async (
  userId,
  regionId,
  amenityId,
  themeId,
  orderBy,
  campName,
  limit,
  offset
) => {
  const campList = await productDao.campList(
    userId,
    regionId,
    amenityId,
    themeId,
    orderBy,
    campName,
    limit,
    offset
  );
  return campList;
};

const getAllZoneByCampId = async (campId) => {
  return productDao.getAllZoneByCampId(campId);
};

const getUnavailableCampingZone = async (campId, startDate, endDate) => {
  return productDao.getUnavailableCampingZone(campId, startDate, endDate);
};

const getAvailableCampingZone = async (campId, unavailableZoneNames) => {
  return productDao.getAvailableCampingZone(campId, unavailableZoneNames);
};

const getCampById = async (campId) => {
  try {
    const existCamp = await productDao.checkCampById(campId);

    if (!existCamp) throw error;

    return await productDao.getCampById(campId);
  } catch (err) {
    err = new Error('COULD NOT PROCESS REQUEST');
    err.statusCode = 400;
    throw err;
  }
};

const getRecommendedProducts = async () => {
  return productDao.getRecommendedProducts();
};
const getAllCategiries = async () => {
  return await productDao.getAllCategiries();
};

const uploadProfileImage = async (userId, profileImage) => {
  try {
    const uploadFile = await upload.uploadFile(profileImage);

    return await productDao.uploadProfileImage(userId, uploadFile);
  } catch (err) {
    err = new Error('COULD NOT PROCESS REQUEST');
    err.statusCode = 400;
    throw err;
  }
};

module.exports = {
  getProductList,
  getAllZoneByCampId,
  getAvailableCampingZone,
  getUnavailableCampingZone,
  getCampById,
  getRecommendedProducts,
  getAllCategiries,
  uploadProfileImage,
};
