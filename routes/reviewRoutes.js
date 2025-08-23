const express = require('express');
const reviewController = require('../controllers/reviewController');
const { validateGitHubUrl, validateBulkReviewRequest } = require('../middleware/validation');

const router = express.Router();

// POST /api/reviews/generate - 새 코드 리뷰 생성
router.post('/generate', validateGitHubUrl, reviewController.generateReview);

// POST /api/reviews/bulk - 대량 코드 리뷰 생성
router.post('/bulk', validateBulkReviewRequest, reviewController.generateBulkReviews);

// GET /api/reviews/bulk/sample-csv - 샘플 CSV 다운로드
router.get('/bulk/sample-csv', reviewController.downloadSampleCsv);

// GET /api/reviews - 모든 리뷰 목록 조회
router.get('/', reviewController.getAllReviews);

// GET /api/reviews/stats - 통계 조회
router.get('/stats', reviewController.getStatistics);

// GET /api/reviews/team/:teamName - 팀명으로 리뷰 검색
router.get('/team/:teamName', reviewController.getReviewsByTeam);

// GET /api/reviews/:id - 특정 리뷰 조회
router.get('/:id', reviewController.getReview);

// DELETE /api/reviews/:id - 리뷰 삭제
router.delete('/:id', reviewController.deleteReview);

module.exports = router;
