export const testService = {
  async triggerWsTest() {
    const response = await fetch(
      'https://smart-canteen-backend-k235.onrender.com/test/ws',
      {
        method: 'GET',
        headers: {
          Accept: '*/*',
        },
      }
    )

    if (!response.ok) {
      throw new Error(`WS test failed with status ${response.status}`)
    }

    const text = await response.text()
    console.log('[WS TEST] Backend response:', text)

    return text
  },
}