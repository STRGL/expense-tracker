"use client"

import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core"
import { SortableContext, useSortable, rectSortingStrategy, arrayMove } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { cn } from "@/lib/utils"
import type { DashboardWidget, DashboardWidgetType } from "@/types/dashboard"

// How many of the 3 grid columns each widget type spans
const WIDGET_SPANS: Record<DashboardWidgetType, string> = {
  summary_cards:       "lg:col-span-3 md:col-span-2",
  spend_by_tag:        "lg:col-span-1",
  spend_over_time:     "lg:col-span-2",
  tag_trends_increase: "lg:col-span-1",
  tag_trends_decrease: "lg:col-span-1",
  top_merchants:       "lg:col-span-1",
  top_transactions:    "lg:col-span-2",
}

interface SortableItemProps {
  widget: DashboardWidget
  locked: boolean
  children: React.ReactNode
}

function SortableItem({ widget, locked, children }: SortableItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: widget.id,
    disabled: locked,
  })

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        WIDGET_SPANS[widget.type] ?? "lg:col-span-1",
        isDragging && "opacity-50 ring-2 ring-primary rounded-lg z-10",
        !locked && "cursor-grab active:cursor-grabbing"
      )}
      {...(!locked ? { ...attributes, ...listeners } : {})}
    >
      {children}
    </div>
  )
}

interface WidgetGridProps {
  widgets: DashboardWidget[]
  locked: boolean
  onReorder: (widgets: DashboardWidget[]) => void
  children: React.ReactNode
}

export default function WidgetGrid({ widgets, locked, onReorder, children }: WidgetGridProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  )

  function handleDragEnd({ active, over }: DragEndEvent) {
    if (!over || active.id === over.id) return
    const oldIndex = widgets.findIndex(w => w.id === active.id)
    const newIndex = widgets.findIndex(w => w.id === over.id)
    if (oldIndex !== -1 && newIndex !== -1) {
      onReorder(arrayMove(widgets, oldIndex, newIndex))
    }
  }

  const childArray = Array.isArray(children) ? children.filter(Boolean) : [children].filter(Boolean)

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={widgets.map(w => w.id)} strategy={rectSortingStrategy}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {childArray.map((child, i) => {
            const widget = widgets[i]
            if (!widget) return null
            return (
              <SortableItem key={widget.id} widget={widget} locked={locked}>
                {child}
              </SortableItem>
            )
          })}
        </div>
      </SortableContext>
    </DndContext>
  )
}
