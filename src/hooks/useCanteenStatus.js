import { useCanteen } from '@/context/CanteenContext'

export function useCanteenStatus() {
  return useCanteen()
}