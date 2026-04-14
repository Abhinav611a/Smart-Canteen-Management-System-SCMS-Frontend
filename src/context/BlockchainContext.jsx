// BlockchainContext — blockchain removed. Stub keeps App.jsx imports working.
/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext } from 'react'
const BlockchainContext = createContext({
  account: null, chainId: null, isConnected: false,
  isConnecting: false, balance: '0', signer: null,
  connectWallet: async () => {}, disconnect: () => {}, refreshBalance: async () => {},
})
export function BlockchainProvider({ children }) {
  return <BlockchainContext.Provider value={BlockchainContext._currentValue}>{children}</BlockchainContext.Provider>
}
export const useBlockchain = () => useContext(BlockchainContext)
export default BlockchainContext
