import { Route } from 'react-router-dom'

import { Router } from 'lib/electron-router-dom'

import { HomeScreen } from './screens/home'
import { MainScreen } from './screens/main'

export function AppRoutes() {
  return (
    <Router
      main={
        <>
          <Route element={<HomeScreen />} path="/" />
          <Route element={<MainScreen />} path="/player" />
        </>
      }
    />
  )
}
