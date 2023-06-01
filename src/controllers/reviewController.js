const reviewService = require('../services/reviewService');
const { catchAsync } = require('../middlewares/error');

const getReview = catchAsync(async (req, res) => {
  const { campId } = req.params;
  const isArray = await reviewService.getReview(campId);

  const result =
    isArray.reviews[0] == undefined
      ? res.status(400).json({
          result: {
            reviews: [],
            total_grade: [
              {
                avg_view: 0,
                avg_safety: 0,
                avg_cost: 0,
                avg_clean: 0,
                avg_convenience: 0,
                total_avg_grade: 0,
              },
            ],
          },
        })
      : res.status(200).json({ result: isArray });
  return result;
});

const postReview = catchAsync(async (req, res) => {
  const userId = req.user;
  const { campId, view, safety, cost, clean, convenience, content } = req.body;
  if (
    !userId ||
    !campId ||
    !view ||
    !safety ||
    !cost ||
    !clean ||
    !convenience ||
    !content
  ) {
    return res.status(400).json({ message: 'KEY_ERROR😞' });
  }

  await reviewService.postReview(
    userId,
    campId,
    view,
    safety,
    cost,
    clean,
    convenience,
    content
  );
  return res.status(201).json({ message: `SUCCESS_INPUT_REVIEW👍` });
});

module.exports = {
  postReview,
  getReview,
};
