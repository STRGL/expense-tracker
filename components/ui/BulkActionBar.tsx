"use client"

import React, { useState } from "react"
import { Trash2, Tag, X, Check, Edit3 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"
import type { TagSummary } from "@/types/api"

interface BulkActionBarProps {
  selectedCount: number
  onClear: () => void
  onDelete?: () => void
  onTagChange?: (tagId: string | null) => void
  onRenameMerchant?: (name: string) => void
  tags?: TagSummary[]
  className?: string
}

export default function BulkActionBar({
  selectedCount,
  onClear,
  onDelete,
  onTagChange,
  onRenameMerchant,
  tags = [],
  className
}: BulkActionBarProps) {
  const [merchantName, setMerchantName] = useState("")
  const [isRenaming, setIsRenaming] = useState(false)
  const [selectedTagId, setSelectedTagId] = useState("")

  if (selectedCount === 0) return null

  return (
    <div className={cn(
      "fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-4 px-4 py-2 bg-background border rounded-full shadow-lg animate-in fade-in slide-in-from-bottom-4 duration-300",
      className
    )}>
      <div className="flex items-center gap-2 border-r pr-4">
        <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full" onClick={onClear}>
          <X className="h-4 w-4" />
        </Button>
        <span className="text-sm font-medium whitespace-nowrap">
          {selectedCount} selected
        </span>
      </div>

      <div className="flex items-center gap-2">
        {onRenameMerchant && (
          <div className="flex items-center gap-1 border-r pr-2 mr-2">
            {isRenaming ? (
              <div className="flex items-center gap-1 animate-in zoom-in-95 duration-200">
                <Input 
                  placeholder="New merchant name" 
                  className="h-8 w-40 text-xs py-0" 
                  value={merchantName}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setMerchantName(e.target.value)}
                  autoFocus
                />
                <Button 
                  size="icon" 
                  variant="ghost" 
                  className="h-8 w-8 text-green-600"
                  onClick={() => {
                    if (merchantName.trim()) {
                      onRenameMerchant(merchantName.trim())
                      setMerchantName("")
                      setIsRenaming(false)
                    }
                  }}
                >
                  <Check className="h-4 w-4" />
                </Button>
                <Button 
                  size="icon" 
                  variant="ghost" 
                  className="h-8 w-8"
                  onClick={() => {
                    setIsRenaming(false)
                    setMerchantName("")
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-8 gap-1.5 px-3"
                onClick={() => setIsRenaming(true)}
              >
                <Edit3 className="h-4 w-4" />
                <span>Rename</span>
              </Button>
            )}
          </div>
        )}

        {onTagChange && (
          <div className="flex items-center gap-1.5">
            <Select 
              value={selectedTagId} 
              onValueChange={(val) => {
                if (val === "none") {
                  onTagChange(null)
                } else {
                  onTagChange(val)
                }
                setSelectedTagId("")
              }}
            >
              <SelectTrigger className="h-8 border-none bg-transparent hover:bg-muted focus:ring-0 w-[140px] gap-2 px-2">
                <Tag className="h-4 w-4" />
                <SelectValue placeholder="Change tag" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Untagged</SelectItem>
                {tags.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: t.colour }} />
                      <span>{t.name}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {onDelete && (
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-8 text-destructive hover:text-destructive hover:bg-destructive/10 gap-1.5 px-3 ml-2"
            onClick={() => {
              if (confirm(`Delete ${selectedCount} items? This cannot be undone.`)) {
                onDelete()
              }
            }}
          >
            <Trash2 className="h-4 w-4" />
            <span>Delete</span>
          </Button>
        )}
      </div>
    </div>
  )
}
