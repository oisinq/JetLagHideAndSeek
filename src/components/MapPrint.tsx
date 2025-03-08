// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck This should not be edited
import L from 'leaflet';
import 'leaflet-easyprint';
import { useEffect } from 'react';
import { useMap } from 'react-leaflet';

export const MapPrint = (props) => {
  const map = useMap();

  useEffect(() => {
    const control = L.easyPrint({
      ...props,
    });
    map.addControl(control);
    return () => {
      map.removeControl(control);
    };
  }, [map]);

  return null;
};
