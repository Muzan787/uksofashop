'use client'
// src/components/Season/HomeSnow.tsx
//
// Very sparse, very quiet snow behind the homepage hero (Run 7), 14 Nov to
// 25 Dec only. The same flake artwork as the seasonal pages at about a third of
// their strength, far and middle layers only (globals.css .season-snow--home),
// behind the copy and the sofa. Decoration only.
import SeasonalSnow from './SeasonalSnow'
import { useSeasonPhase } from './useSeasonPhase'

export default function HomeSnow() {
  return useSeasonPhase() === 'off' ? null : <SeasonalSnow className="season-snow--home h-full" />
}
