'use client'
// src/app/admin/meta/StaffDeviceSwitch.tsx
//
// "Exclude this device" (admin upgrade N6). Marks the phone or computer it is
// pressed on as staff, with a cookie the shop's own scripts and every
// tracking route check: no tag loads on it, no event from it is sent or
// recorded, and an order placed on it is marked as a test. One device at a
// time - press it on each phone and computer the team uses.

import { useState, useSyncExternalStore } from 'react'
import { Loader2, MonitorSmartphone } from 'lucide-react'
import { setStaffDevice } from '@/app/actions/tracking'
import { STAFF_DEVICE_COOKIE } from '@/utils/trackingEnv'

const subscribeToNothing = () => () => {}
const readCookie = () => document.cookie.split(';').some(c => c.trim() === `${STAFF_DEVICE_COOKIE}=1`)

export default function StaffDeviceSwitch() {
  // null until the browser has been read: the server can't know which device this is.
  const fromCookie = useSyncExternalStore(subscribeToNothing, readCookie, () => null)
  const [changed, setChanged] = useState<boolean | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const on = changed ?? fromCookie

  return (
    <div>
      <p className={`m-0 flex items-center gap-2 text-sm font-bold ${on ? 'text-green-800' : 'text-stone-900'}`}>
        <MonitorSmartphone className="h-5 w-5 shrink-0" aria-hidden="true" />
        {on === null ? 'Checking this device…' : on ? 'Excluded: nothing done on this device counts' : 'This device counts like a customer’s'}
      </p>
      <p className="m-0 mt-1 text-xs leading-relaxed text-stone-600">
        When it’s excluded, no Meta or Google tag loads here, nothing you do here is sent or recorded, and an order placed here is marked as a test. It applies to this browser only; do it on each phone and computer the team uses.
      </p>
      <button
        type="button"
        disabled={busy || on === null}
        onClick={async () => {
          const next = !on
          if (!next && !window.confirm('Count this device again? Visits and orders from it will reach Meta and Google like a customer’s.')) return
          setBusy(true)
          setError('')
          const res = await setStaffDevice(next)
          setBusy(false)
          if (res.ok) setChanged(next)
          else setError(res.text)
        }}
        className={`mt-3 inline-flex min-h-11 items-center gap-2 rounded-sm px-4 text-sm font-bold disabled:opacity-50 ${on ? 'border border-stone-300 bg-white text-stone-800' : 'bg-stone-900 text-white'}`}
      >
        {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
        {on ? 'Count this device again' : 'Exclude this device'}
      </button>
      {error && <p role="alert" className="m-0 mt-2 text-sm font-semibold text-red-700">{error}</p>}
    </div>
  )
}
