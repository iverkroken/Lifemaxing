import { createContext, useContext } from 'react'
export const TimeHubContext = createContext(null)
export const useTimeHub = () => useContext(TimeHubContext)
