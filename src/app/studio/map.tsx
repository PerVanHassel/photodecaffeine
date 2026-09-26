import "maplibre-gl/dist/maplibre-gl.css";
import type { StyleSpecification } from "maplibre-gl";
import { MapPin } from "lucide-react";
import { Layer, Map as MapGL, Marker, Source } from "react-map-gl/maplibre";
import { offsetPoint } from "./light";
import { cx } from "./ui";

// OpenFreeMap vector tiles (free, no key) and PDOK aerial photos for the
// Netherlands (open data). Glyphs come from OpenFreeMap for cluster labels.
const GLYPHS = "https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf";

const aerial: StyleSpecification = {
  version: 8,
  glyphs: GLYPHS,
  sources: {
    photo: {
      type: "raster",
      tiles: ["https://service.pdok.nl/hwh/luchtfotorgb/wmts/v1_0/Actueel_orthoHR/EPSG:3857/{z}/{x}/{y}.jpeg"],
      tileSize: 256,
      maxzoom: 19,
      attribution: "Luchtfoto © PDOK / Beeldmateriaal Nederland",
    },
  },
  layers: [{ id: "photo", type: "raster", source: "photo" }],
};

export const MAP_STYLES = {
  kaart: "https://tiles.openfreemap.org/styles/liberty",
  licht: "https://tiles.openfreemap.org/styles/positron",
  luchtfoto: aerial,
} as const;
export type MapStyleName = keyof typeof MAP_STYLES;

export const MAP_STYLE_LABEL: Record<MapStyleName, string> = { kaart: "Kaart", licht: "Licht", luchtfoto: "Luchtfoto" };

export function Pin({ active, draft, label }: { active?: boolean; draft?: boolean; label?: string }) {
  return (
    <span className={cx("s-pin", active && "on", draft && "draft")} aria-label={label} role="img">
      <span><i><MapPin /></i></span>
    </span>
  );
}

/** A GeoJSON line from a point toward the sun, drawn on the map. */
export function SunRay({ lat, lng, bearing, id = "sun" }: { lat: number; lng: number; bearing: number; id?: string }) {
  const end = offsetPoint(lat, lng, bearing, 600);
  return (
    <Source id={`${id}-src`} type="geojson" data={{ type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: [[lng, lat], end] } }}>
      <Layer id={`${id}-glow`} type="line" paint={{ "line-color": "#e9a45c", "line-width": 10, "line-opacity": 0.25, "line-blur": 4 }} />
      <Layer id={`${id}-line`} type="line" paint={{ "line-color": "#b06a2c", "line-width": 2.5, "line-dasharray": [2, 1.5] }} />
    </Source>
  );
}

/** A small, fixed map for cards: one pin, optional sun line. */
export function MiniMap({ lat, lng, bearing, zoom = 14, style = "licht" }: {
  lat: number; lng: number; bearing?: number | null; zoom?: number; style?: MapStyleName;
}) {
  return (
    <div className="s-mini-map">
      <MapGL
        initialViewState={{ latitude: lat, longitude: lng, zoom }}
        mapStyle={MAP_STYLES[style] as any}
        interactive={false}
        attributionControl={false}
        style={{ position: "absolute", inset: 0 }}
        // The card may still be settling (fonts, scrollbar) when the map
        // first measures itself; measure again once it has loaded.
        onLoad={(e) => setTimeout(() => e.target.resize(), 60)}
      >
        {typeof bearing === "number" && <SunRay lat={lat} lng={lng} bearing={bearing} id="mini-sun" />}
        <Marker latitude={lat} longitude={lng} anchor="bottom">
          <Pin active />
        </Marker>
      </MapGL>
    </div>
  );
}
