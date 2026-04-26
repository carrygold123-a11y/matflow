export interface CoordinatePoint {
    lat: number;
    lng: number;
}
export declare function haversineDistance(from: CoordinatePoint, to: CoordinatePoint): number;
