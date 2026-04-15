import api from './api'
import { ENDPOINTS } from '@/utils/constants'

export const ratingService = {
  async submitRating({ foodItemId, rating, review }) {
    if (!foodItemId || !rating) {
      throw new Error('Food item ID and rating are required')
    }

    if (rating < 1 || rating > 5) {
      throw new Error('Rating must be between 1 and 5')
    }

    const params = {
      foodItemId: Number(foodItemId),
      rating: Number(rating),
      review: review?.trim() || undefined,
    }

    return api.post(ENDPOINTS.RATING_RATE, null, { params })
  },
}
