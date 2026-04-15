import { useState } from 'react'
import Modal, { ModalFooter } from './Modal'
import Button from './Button'
import StarRating from './StarRating'

/**
 * RatingModal — modal for submitting item ratings
 *
 * Usage:
 *   <RatingModal
 *     open={open}
 *     onClose={() => setOpen(false)}
 *     itemName="Chicken Biryani"
 *     onSubmit={handleSubmit}
 *   />
 */
export default function RatingModal({
  open,
  onClose,
  itemName,
  onSubmit,
}) {
  const [rating, setRating] = useState(0)
  const [review, setReview] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async () => {
    if (rating < 1 || rating > 5) {
      return
    }

    setSubmitting(true)
    try {
      await onSubmit({ rating, review: review.trim() || undefined })
      // Reset form on success
      setRating(0)
      setReview('')
      onClose()
    } catch (error) {
      // Error handling is done in onSubmit
    } finally {
      setSubmitting(false)
    }
  }

  const handleClose = () => {
    if (!submitting) {
      setRating(0)
      setReview('')
      onClose()
    }
  }

  return (
    <Modal open={open} onClose={handleClose} title={`Rate ${itemName}`} size="md">
      <div className="space-y-6">
        <div className="text-center">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            How would you rate this item?
          </p>
          <StarRating
            value={rating}
            onChange={setRating}
            size="lg"
            disabled={submitting}
          />
          {rating > 0 && (
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              {rating} star{rating !== 1 ? 's' : ''}
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor="review"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
          >
            Review (optional)
          </label>
          <textarea
            id="review"
            value={review}
            onChange={(e) => setReview(e.target.value)}
            disabled={submitting}
            placeholder="Share your thoughts about this item..."
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed resize-none"
          />
        </div>
      </div>

      <ModalFooter>
        <Button
          variant="secondary"
          onClick={handleClose}
          disabled={submitting}
        >
          Cancel
        </Button>
        <Button
          variant="primary"
          onClick={handleSubmit}
          disabled={rating < 1 || rating > 5 || submitting}
          loading={submitting}
        >
          {submitting ? 'Submitting...' : 'Submit Rating'}
        </Button>
      </ModalFooter>
    </Modal>
  )
}