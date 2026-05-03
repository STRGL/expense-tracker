// components/dashboard/WidgetGrid.js
"use client"

import { useCallback } from "react"
import { ResponsiveGridLayout } from "react-grid-layout"
import "react-grid-layout/css/styles.css"
import "react-resizable/css/styles.css"

export default function WidgetGrid({ layout, locked, onLayoutChange, children }) {
  const handleChange = useCallback((newLayout) => {
    if (!locked) onLayoutChange?.(newLayout)
  }, [locked, onLayoutChange])

  return (
    <ResponsiveGridLayout
      className="layout"
      layouts={{ lg: layout }}
      breakpoints={{ lg: 1200, md: 768 }}
      cols={{ lg: 12, md: 6 }}
      rowHeight={60}
      isDraggable={!locked}
      isResizable={!locked}
      onLayoutChange={handleChange}
      margin={[12, 12]}
    >
      {children}
    </ResponsiveGridLayout>
  )
}
