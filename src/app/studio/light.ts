import { useQuery } from "@tanstack/react-query";
import SunCalc from "suncalc";

// Light for a place and a day: when the sun sets, when the golden and blue
// hours are, and where the sun stands. SunCalc works offline; the weather
// comes from Open-Meteo, which needs no key.

export type LightInfo = {
  sunrise: Date;
  sunset: Date;
  /** Evening golden hour starts (sun ~6° above the horizon). */
  goldenEvening: Date;
  /** Morning golden hour ends. */
  goldenMorningEnd: Date;
  /** Blue hour: the sun just below the horizon after sunset. */
  blueHourStart: Date;
  blueHourEnd: Date;
  /** Compass bearing of the sun (0 = north, 90 = east) at golden hour. */
  goldenAzimuth: number;
  sunsetAzimuth: number;
};

const valid = (d: Date) => d instanceof Date && !Number.isNaN(d.getTime());

/** Compass degrees from SunCalc's azimuth (radians, measured from south). */
export function bearingAt(date: Date, lat: number, lng: number): number {
  const { azimuth } = SunCalc.getPosition(date, lat, lng);
  return Math.round(((azimuth * 180) / Math.PI + 180 + 360) % 360);
}

export function lightFor(date: Date, lat: number, lng: number): LightInfo | null {
  const noon = new Date(date);
  noon.setHours(12, 0, 0, 0);
  const t = SunCalc.getTimes(noon, lat, lng);
  if (!valid(t.sunset) || !valid(t.goldenHour)) return null;
  return {
    sunrise: t.sunrise,
    sunset: t.sunset,
    goldenEvening: t.goldenHour,
    goldenMorningEnd: t.goldenHourEnd,
    blueHourStart: t.sunset,
    blueHourEnd: valid(t.dusk) ? t.dusk : t.sunset,
    goldenAzimuth: bearingAt(t.goldenHour, lat, lng),
    sunsetAzimuth: bearingAt(t.sunset, lat, lng),
  };
}

export function compass(deg: number): string {
  const names = ["N", "NO", "O", "ZO", "Z", "ZW", "W", "NW"];
  return names[Math.round(deg / 45) % 8];
}

/** A point `meters` away from lat/lng along a compass bearing. */
export function offsetPoint(lat: number, lng: number, bearing: number, meters: number): [number, number] {
  const R = 6371000;
  const b = (bearing * Math.PI) / 180;
  const φ1 = (lat * Math.PI) / 180;
  const λ1 = (lng * Math.PI) / 180;
  const d = meters / R;
  const φ2 = Math.asin(Math.sin(φ1) * Math.cos(d) + Math.cos(φ1) * Math.sin(d) * Math.cos(b));
  const λ2 = λ1 + Math.atan2(Math.sin(b) * Math.sin(d) * Math.cos(φ1), Math.cos(d) - Math.sin(φ1) * Math.sin(φ2));
  return [(λ2 * 180) / Math.PI, (φ2 * 180) / Math.PI];
}

// ---------------------------------------------------------------------------
// Weather
// ---------------------------------------------------------------------------

export type Weather = {
  temperature: number;
  precipitationChance: number;
  cloudCover: number;
  wind: number;
  code: number;
  summary: string;
};

// WMO weather interpretation codes, as Open-Meteo returns them.
function describe(code: number): string {
  if (code === 0) return "Helder";
  if (code <= 2) return "Licht bewolkt";
  if (code === 3) return "Bewolkt";
  if (code === 45 || code === 48) return "Mist";
  if (code >= 51 && code <= 57) return "Motregen";
  if (code >= 61 && code <= 67) return "Regen";
  if (code >= 71 && code <= 77) return "Sneeuw";
  if (code >= 80 && code <= 82) return "Buien";
  if (code >= 95) return "Onweer";
  return "Wisselend";
}

/** Beaufort from km/h. */
export function beaufort(kmh: number): number {
  const limits = [1, 6, 12, 20, 29, 39, 50, 62, 75, 89, 103, 118];
  const i = limits.findIndex((l) => kmh < l);
  return i === -1 ? 12 : i;
}

async function fetchWeather(lat: number, lng: number, at: Date): Promise<Weather | null> {
  const day = at.toLocaleDateString("sv-SE", { timeZone: "Europe/Amsterdam" });
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat.toFixed(4)}&longitude=${lng.toFixed(4)}` +
    `&hourly=temperature_2m,precipitation_probability,cloud_cover,wind_speed_10m,weather_code` +
    `&timezone=Europe%2FAmsterdam&start_date=${day}&end_date=${day}`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const data = await res.json();
  const times: string[] = data?.hourly?.time || [];
  if (!times.length) return null;
  const hour = Number(at.toLocaleTimeString("en-GB", { timeZone: "Europe/Amsterdam", hour: "2-digit", hour12: false }));
  const i = Math.min(Math.max(hour, 0), times.length - 1);
  const h = data.hourly;
  return {
    temperature: Math.round(h.temperature_2m[i]),
    precipitationChance: h.precipitation_probability?.[i] ?? 0,
    cloudCover: h.cloud_cover?.[i] ?? 0,
    wind: Math.round(h.wind_speed_10m?.[i] ?? 0),
    code: h.weather_code?.[i] ?? 0,
    summary: describe(h.weather_code?.[i] ?? 0),
  };
}

/** The forecast for a place at a moment; only asked for within the 15-day window. */
export function useWeather(lat?: number | null, lng?: number | null, at?: Date | null) {
  const inRange = !!at && at.getTime() > Date.now() - 86400000 && at.getTime() < Date.now() + 15 * 86400000;
  const hourKey = at ? Math.floor(at.getTime() / 3600000) : 0;
  return useQuery({
    queryKey: ["weather", lat?.toFixed(3), lng?.toFixed(3), hourKey],
    queryFn: () => fetchWeather(lat!, lng!, at!),
    enabled: typeof lat === "number" && typeof lng === "number" && inRange,
    staleTime: 30 * 60_000,
    retry: 1,
  });
}
