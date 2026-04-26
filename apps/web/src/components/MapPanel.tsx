import { CircleMarker, MapContainer, Popup, TileLayer } from 'react-leaflet';
import type { MaterialItem, SiteSummary } from '@matflow/shared-types';
import { useI18n } from '../i18n';

export function MapPanel({ materials, sites }: { materials: MaterialItem[]; sites: SiteSummary[] }) {
  const { formatCategory, formatNumber, t } = useI18n();
  const center = materials[0]?.location || {
    lat: sites[0]?.latitude || 51.1657,
    lng: sites[0]?.longitude || 10.4515,
  };

  return (
    <div className="panel panel--map">
      <div className="panel__header">
        <p className="panel__eyebrow">{t('map.eyebrow')}</p>
        <h3 className="panel__title">{t('map.title')}</h3>
      </div>
      <MapContainer center={[center.lat, center.lng]} zoom={6} scrollWheelZoom={false} className="map-frame">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />
        {sites.map((site) => (
          <CircleMarker key={site.id} center={[site.latitude, site.longitude]} radius={10} pathOptions={{ color: '#111111', fillColor: '#f5bf18', fillOpacity: 0.9 }}>
            <Popup>
              <strong>{site.name}</strong>
              <div>
                {site.latitude.toFixed(4)}, {site.longitude.toFixed(4)}
              </div>
            </Popup>
          </CircleMarker>
        ))}
        {materials.map((material) => (
          <CircleMarker key={material.id} center={[material.location.lat, material.location.lng]} radius={8} pathOptions={{ color: '#f5bf18', fillColor: '#111111', fillOpacity: 0.85 }}>
            <Popup>
              <strong>{material.title}</strong>
              <div>{formatCategory(material.category)}</div>
              <div>{t('map.distanceAway', { value: formatNumber(material.distanceKm, material.distanceKm % 1 === 0 ? undefined : { maximumFractionDigits: 1 }) })}</div>
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>
    </div>
  );
}
