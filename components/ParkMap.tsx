'use client';

import { MapContainer, TileLayer, CircleMarker, Tooltip } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

export interface ParkData {
  id: string;
  name: string;
  lat: number;
  lng: number;
  water_kld: number;
  investment_cr: number;
  total_jobs: number;
}

interface ParkMapProps {
  parks: ParkData[];
}

export default function ParkMap({ parks }: ParkMapProps) {
  return (
    <MapContainer
      center={[11.1271, 78.6569]} // Tamil Nadu center
      zoom={7}
      style={{ height: '600px', width: '100%', borderRadius: '12px' }}
      scrollWheelZoom={true}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {parks.map(park => {
        const isHighUsage = park.water_kld > 1000;
        return (
          <CircleMarker
            key={park.id}
            center={[park.lat, park.lng]}
            radius={18}
            pathOptions={{
              color: isHighUsage ? '#FF9900' : '#003366',
              fillColor: isHighUsage ? '#FF9900' : '#003366',
              fillOpacity: 0.7,
              weight: 3,
            }}
          >
            <Tooltip direction="top" offset={[0, -10]} permanent={false}>
              <div style={{ fontFamily: 'Inter, sans-serif', minWidth: '160px' }}>
                <p style={{ fontWeight: 700, color: '#003366', marginBottom: 4 }}>{park.name}</p>
                <p style={{ fontSize: 12, color: '#555' }}>💧 Water: <strong style={{ color: isHighUsage ? '#FF9900' : '#333' }}>{park.water_kld.toLocaleString()} KLD</strong></p>
                <p style={{ fontSize: 12, color: '#555' }}>💼 Investment: ₹{park.investment_cr.toLocaleString()} Cr</p>
                <p style={{ fontSize: 12, color: '#555' }}>👷 Jobs: {park.total_jobs.toLocaleString()}</p>
                {isHighUsage && <p style={{ fontSize: 11, color: '#FF9900', fontWeight: 700, marginTop: 4 }}>⚠ Water Alert</p>}
              </div>
            </Tooltip>
          </CircleMarker>
        );
      })}
    </MapContainer>
  );
}
