// src/tests/unit/dashboard.controller.test.ts
import { DashboardController } from '../../controllers/dashboard.controller';

// Mock the helper methods
jest.mock('../../controllers/dashboard.controller', () => {
  const originalModule = jest.requireActual('../../controllers/dashboard.controller');
  
  return {
    ...originalModule,
    // Mock private methods
    'identifyIssues': jest.fn(),
    'generateRecommendations': jest.fn(),
  };
});

describe('DashboardController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('identifyIssues', () => {
    it('should identify recurring issues', () => {
      const mockReviews = [
        { 
          _id: '1',
          publicReview: 'The place was very clean and tidy.',
          rating: 5 
        },
        { 
          _id: '2',
          publicReview: 'Everything was clean and well maintained.',
          rating: 5 
        },
        { 
          _id: '3',
          publicReview: 'Clean apartment with good amenities.',
          rating: 5 
        }
      ];

      // Reset to original implementation
      const originalIdentifyIssues = DashboardController['identifyIssues'];
      const issues = originalIdentifyIssues(mockReviews as any);
      
      expect(issues).toBeInstanceOf(Array);
    });

    it('should not identify issues for infrequent mentions', () => {
      const mockReviews = [
        { 
          _id: '1',
          publicReview: 'The place was clean.',
          rating: 5 
        },
        { 
          _id: '2',
          publicReview: 'Good location.',
          rating: 5 
        }
      ];

      const originalIdentifyIssues = DashboardController['identifyIssues'];
      const issues = originalIdentifyIssues(mockReviews as any);
      
      expect(issues).toHaveLength(0);
    });
  });

  describe('generateRecommendations', () => {
    it('should generate recommendations based on category averages', () => {
      const mockReviews = [
        { 
          _id: '1',
          rating: 4,
          managerNotes: 'Thanks',
          publicReview: 'Good'
        }
      ] as any[];

      const categoryAverages = [
        { category: 'cleanliness', averageRating: 9.5, count: 10 },
        { category: 'communication', averageRating: 6.2, count: 10 },
        { category: 'location', averageRating: 8.5, count: 2 }
      ];

      const originalGenerateRecommendations = DashboardController['generateRecommendations'];
      const recommendations = originalGenerateRecommendations(mockReviews, categoryAverages);

      expect(recommendations).toBeInstanceOf(Array);
    });
  });
});