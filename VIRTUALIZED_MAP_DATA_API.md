# Virtualized Map Data API

This document outlines the API for fetching virtualized map data, which is designed to efficiently load only the data visible within the current map viewport.

## Endpoint

The API is exposed as a Supabase Edge Function:

`/functions/v1/get-map-data-in-view`

## Method

`POST`

## Body Parameters

The function expects a JSON object with the following properties:

| Parameter | Type   | Description                                           |
|-----------|--------|-------------------------------------------------------|
| `min_lat` | number | The minimum latitude of the map's bounding box.       |
| `min_lon` | number | The minimum longitude of the map's bounding box.      |
| `max_lat` | number | The maximum latitude of the map's bounding box.       |
| `max_lon` | number | The maximum longitude of the map's bounding box.      |
| `zoom`    | number | The current zoom level of the map.                    |

### Example Request

```json
{
  "min_lat": 9.0,
  "min_lon": 8.0,
  "max_lat": 10.0,
  "max_lon": 9.0,
  "zoom": 12
}
```

## Success Response

**Code:** `200 OK`

**Content:**

A JSON object containing arrays of map entities that are within the requested bounding box.

```json
{
  "facilities": [
    {
      "id": "uuid-goes-here",
      "name": "Central Warehouse",
      "address": "123 Main St",
      "lat": 9.05,
      "lng": 8.55,
      "type": "warehouse"
    }
  ],
  "warehouses": [ ... ],
  "vehicles": [
    {
      "id": "uuid-goes-here",
      "model": "Toyota Hilux",
      "plate_number": "ABC-123",
      "status": "available",
      "current_driver_id": "uuid-goes-here",
      "lat": 9.05,
      "lng": 8.55
    }
  ],
  "drivers": [
    {
      "id": "uuid-goes-here",
      "full_name": "John Doe",
      "phone_number": "555-1234"
    }
  ],
  "zones": [
    {
      "id": "uuid-goes-here",
      "name": "Northern Zone",
      "code": "NZ-01",
      "region_center": { "lat": 10.0, "lng": 8.5 }
    }
  ],
  "batches": [
    {
      "id": "uuid-goes-here",
      "name": "Batch-001",
      "status": "in-progress",
      "priority": "high",
      "optimized_route": [ [8.55, 9.05], [8.60, 9.10] ],
      "warehouse_id": "uuid-goes-here",
      "driver_id": "uuid-goes-here",
      "vehicle_id": "uuid-goes-here"
    }
  ]
}
```

## Error Response

**Code:** `500 Internal Server Error`

**Content:**

```json
{
  "error": "Error message describing the issue."
}
```
