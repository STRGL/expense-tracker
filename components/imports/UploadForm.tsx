// components/imports/UploadForm.js
"use client"

import { useState, useRef } from "react"
import { useRouter } from "next/navigation"
import Papa from "papaparse"
import { Upload } from "lucide-react"
import type { ChangeEvent, FormEvent } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { detectDateFormat } from "@/lib/date-detector"

type CSVRow = Record<string, string>

export default function UploadForm() {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)
  const [headers, setHeaders] = useState<string[]>([])
  const [preview, setPreview] = useState<CSVRow[]>([])
  const [csvText, setCsvText] = useState("")
  const [bankName, setBankName] = useState("")
  const [dateColumn, setDateColumn] = useState("")
  const [merchantColumn, setMerchantColumn] = useState("")
  const [amountColumn, setAmountColumn] = useState("")
  const [creditColumn, setCreditColumn] = useState("")
  const [invertSigns, setInvertSigns] = useState(false)
  const [detectedFormat, setDetectedFormat] = useState("")
  const [dateFormat, setDateFormat] = useState("")
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState("")
  const [fileName, setFileName] = useState("")

  function handleFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setFileName(file.name)
    const reader = new FileReader()
    reader.onload = (ev) => {
      const text = String(ev.target?.result ?? "")
      setCsvText(text)
      const { data, meta } = Papa.parse<CSVRow>(text, { header: true, skipEmptyLines: true })
      const cols = meta.fields ?? []
      setHeaders(cols)
      setPreview(data.slice(0, 5))
      setDateColumn(cols.find(c => /date/i.test(c)) ?? cols[0] ?? "")
      setMerchantColumn(cols.find(c => /description|merchant|details/i.test(c)) ?? cols[1] ?? "")
      setAmountColumn(cols.find(c => /amount|debit|credit/i.test(c)) ?? cols[2] ?? "")
    }
    reader.readAsText(file)
  }

  function handleDateColumnChange(col: string) {
    setDateColumn(col)
    if (preview.length > 0 && col) {
      const samples = preview.map(r => r[col]).filter(Boolean)
      const fmt = detectDateFormat(samples)
      setDetectedFormat(fmt ?? "")
      setDateFormat(fmt ?? "DD/MM/YYYY")
    }
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError("")
    if (!csvText) { setError("Please select a CSV file."); return }
    if (!dateColumn || !merchantColumn || !amountColumn) {
      setError("Please map all three columns.")
      return
    }
    setUploading(true)
    const res = await fetch("/api/imports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        csvText, 
        dateColumn, 
        merchantColumn, 
        amountColumn, 
        creditColumn: creditColumn || null, 
        invertSigns,
        bankName: bankName || null 
      }),
    })
    const data = await res.json()
    setUploading(false)
    if (!res.ok) { setError(data.error ?? "Upload failed."); return }
    router.push(`/imports/${data.id}`)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Select CSV file</CardTitle>
          <CardDescription>Download your statement from your bank and upload it here.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="file">CSV file</Label>
            <div className="flex items-center gap-3">
              <input
                id="file"
                type="file"
                accept=".csv,text/csv"
                ref={fileRef}
                onChange={handleFile}
                className="hidden"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => fileRef.current?.click()}
                className="w-full sm:w-auto"
              >
                <Upload className="mr-2 h-4 w-4" />
                {fileName ? "Change file" : "Choose CSV file"}
              </Button>
              {fileName && (
                <span className="text-sm text-muted-foreground truncate italic">
                  {fileName}
                </span>
              )}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="bankName">Bank name <span className="text-muted-foreground text-xs">(optional — saves column mapping for next time)</span></Label>
            <Input id="bankName" value={bankName} onChange={e => setBankName(e.target.value)} placeholder="e.g. Barclays" />
          </div>
        </CardContent>
      </Card>

      {headers.length > 0 && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Preview (first 5 rows)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="text-xs w-full">
                  <thead>
                    <tr className="border-b">
                      {headers.map(h => <th key={h} className="text-left px-2 py-1 font-medium">{h}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {preview.map((row, i) => (
                      <tr key={i} className="border-b last:border-0">
                        {headers.map(h => <td key={h} className="px-2 py-1 text-muted-foreground">{row[h]}</td>)}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Map columns</CardTitle>
              <CardDescription>Tell us which column contains the date, merchant, and amount.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                { label: "Date column", value: dateColumn, onChange: handleDateColumnChange },
                { label: "Merchant column", value: merchantColumn, onChange: setMerchantColumn },
                { label: "Debit / Money Out column", value: amountColumn, onChange: setAmountColumn },
              ].map(({ label, value, onChange }) => (
                <div key={label} className="space-y-1.5">
                  <Label>{label}</Label>
                  <select
                    className="w-full h-8 rounded-md border bg-background px-2 text-sm"
                    value={value}
                    onChange={e => onChange(e.target.value)}
                  >
                    <option value="">— select —</option>
                    {headers.map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>
              ))}

              <div className="space-y-1.5">
                <Label>
                  Credit / Money In column <span className="text-muted-foreground text-xs">(optional — select if your bank uses separate debit and credit columns)</span>
                </Label>
                <select
                  className="w-full h-8 rounded-md border bg-background px-2 text-sm"
                  value={creditColumn}
                  onChange={e => setCreditColumn(e.target.value)}
                >
                  <option value="">— none (single amount column) —</option>
                  {headers.map(h => <option key={h} value={h}>{h}</option>)}
                </select>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  id="invertSigns"
                  type="checkbox"
                  checked={invertSigns}
                  onChange={e => setInvertSigns(e.target.checked)}
                  className="h-4 w-4"
                />
                <Label htmlFor="invertSigns" className="font-normal cursor-pointer text-sm">
                  Invert signs <span className="text-muted-foreground text-xs">(Flip positive to negative and vice versa)</span>
                </Label>
              </div>

              {detectedFormat && (
                <div className="space-y-1.5">
                  <Label>Date format</Label>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Detected:</span>
                    <select
                      className="h-8 rounded-md border bg-background px-2 text-sm"
                      value={dateFormat}
                      onChange={e => setDateFormat(e.target.value)}
                    >
                      <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                      <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                      <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                    </select>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex justify-end">
        <Button type="submit" disabled={uploading || !csvText}>
          {uploading ? "Processing..." : "Process import"}
        </Button>
      </div>
    </form>
  )
}
