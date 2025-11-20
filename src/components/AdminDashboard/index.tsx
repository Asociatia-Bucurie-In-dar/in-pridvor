import React from 'react'
import { CacheRevalidationWidget } from './CacheRevalidationWidget'
import { ViewSiteButton } from '@/components/ViewSiteButton'

const AdminDashboard: React.FC = () => {
  return (
    <div>
      <ViewSiteButton />
      <CacheRevalidationWidget />
    </div>
  )
}

export default AdminDashboard
