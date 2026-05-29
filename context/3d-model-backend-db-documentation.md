# CraftIt 3D Model Backend and Database Documentation

Date: 2026-04-17
Scope: Current implementation in this repository (backend APIs, MongoDB models, and storage paths related to 3D model files)

## 1. Executive Summary

In this project, 3D model binaries are stored in AWS S3, while MongoDB stores only metadata (URL, filename, size, optional dimensions).

There are two primary business entities that carry 3D model metadata:

1. Product (`Product.model3D`)
2. Custom Order (`CustomOrder.model3D`)

3D metadata then flows downstream:

1. Custom Order -> RFQ (via population of `customOrderId`)
2. RFQ accepted bid -> Order snapshot (`productDetails.specifications.model3D`) and `designFiles`

Important: Advanced 3D collaboration features (pins, annotations, hotspots, conversion pipelines, camera-state persistence, pan/zoom/rotate state persistence) are not implemented in backend/database in this codebase.

## 2. System Architecture (3D-related)

## 2.1 Storage layers

1. File binary storage: AWS S3
2. Metadata storage: MongoDB (via Mongoose)
3. Access/API layer: Next.js App Router API routes under `app/api`

## 2.2 High-level flow

1. Client uploads a 3D file to `/api/upload` with `type=3d-model`.
2. API validates extension and file size, then uploads binary to S3.
3. API returns `{ file: { url, filename, fileSize, type } }`.
4. Client includes returned metadata in product/custom-order payload.
5. Product/CustomOrder routes persist metadata in MongoDB.
6. RFQ and Order routes read/copy metadata for downstream workflows.

## 3. Data Model and Collections

## 3.1 Product model (`models/Product.js`)

3D field:

```js
model3D: {
  url: String,
  filename: String,
  fileSize: Number,
}
```

MongoDB collection: `products` (Mongoose pluralization from model name `Product`)

Notes:

1. `model3D` is optional.
2. No 3D-specific indexes exist.
3. No fields for annotations/pins/camera/converted formats.

Example document fragment:

```json
{
  "_id": "<productId>",
  "name": "Part A",
  "status": "active",
  "model3D": {
    "url": "https://<bucket>.s3.<region>.amazonaws.com/3d-models/1713370000000-part-a.glb",
    "filename": "part-a.glb",
    "fileSize": 7340032
  }
}
```

## 3.2 CustomOrder model (`models/CustomOrder.js`)

3D field:

```js
model3D: {
  url: String,
  filename: String,
  fileSize: Number,
  dimensions: {
    length: Number,
    width: Number,
    height: Number,
    unit: { type: String, default: "mm" }
  }
}
```

MongoDB collection: `customorders`

Notes:

1. `model3D` is optional.
2. `dimensions` exists in schema but is not automatically computed by backend upload route.
3. Client may send dimensions manually.

Example document fragment:

```json
{
  "_id": "<customOrderId>",
  "title": "Bracket redesign",
  "status": "submitted",
  "model3D": {
    "url": "https://<bucket>.s3.<region>.amazonaws.com/3d-models/1713370001000-bracket.stl",
    "filename": "bracket.stl",
    "fileSize": 2543301,
    "dimensions": {
      "length": 120,
      "width": 45,
      "height": 30,
      "unit": "mm"
    }
  }
}
```

## 3.3 RFQ model (`models/RFQ.js`)

RFQ does not store `model3D` directly. It stores a reference:

```js
customOrderId: { type: ObjectId, ref: "CustomOrder" }
```

MongoDB collection: `rfqs`

3D data is accessed by populating `customOrderId` in RFQ routes.

## 3.4 Order model (`models/Order.js`)

Order stores 3D links in two ways for RFQ orders:

1. Nested snapshot: `productDetails.specifications.model3D`
2. Flat list: `designFiles: [String]`

MongoDB collection: `orders`

Important behavior:

1. RFQ accepted-bid flow copies custom-order model data into order.
2. Direct product-order flow does not copy `Product.model3D` into `Order` currently.

## 4. Upload APIs and S3 Contracts

## 4.1 Single upload: `POST /api/upload`

File: `app/api/upload/route.js`

Auth:

1. Required (`resolveRequestSession`)
2. Supports NextAuth session or bearer token flow via `resolveRequestSession`

Request (multipart/form-data):

1. `file`: single file
2. `type`: one of `3d-model`, `image`, `document`

3D validation rules:

1. Allowed extensions: `.stl`, `.obj`, `.gltf`, `.glb`
2. Max size: 50 MB
3. S3 folder prefix: `3d-models`

S3 key format:

```txt
3d-models/<timestamp>-<sanitizedOriginalName>
```

Response shape:

```json
{
  "success": true,
  "file": {
    "url": "https://<bucket>.s3.<region>.amazonaws.com/3d-models/<key>",
    "filename": "original.ext",
    "fileSize": 12345,
    "type": "3d-model"
  }
}
```

## 4.2 Multiple upload: `POST /api/upload/multiple`

File: `app/api/upload/multiple/route.js`

Auth:

1. Required (`resolveRequestSession`)

Request (multipart/form-data):

1. `files`: one or more files
2. `folder`: optional folder prefix, default `uploads`

S3 key format:

```txt
<folder>/<timestamp>-<random>-<sanitizedOriginalName>
```

Response shape:

```json
{
  "success": true,
  "message": "Uploaded X of Y files",
  "files": [
    {
      "url": "https://...",
      "filename": "...",
      "fileSize": 123
    }
  ],
  "errors": [
    {
      "filename": "...",
      "error": "..."
    }
  ]
}
```

Notes:

1. This route currently does not enforce extension/size policy like `/api/upload` does.
2. `folder` is client-controlled.

## 5. 3D Metadata Write Paths (MongoDB)

## 5.1 Product writes

### Create product

Endpoint: `POST /api/products`
File: `app/api/products/route.js`

Writes:

1. Entire incoming payload to `Product.create(...)`
2. Includes `model3D` if provided

3D-specific rule:

1. Unverified manufacturers are blocked if `productData.model3D?.url` exists.

### Update product

Endpoint: `PUT /api/products/[id]`
File: `app/api/products/[id]/route.js`

Writes:

1. `$set: updateData`
2. Includes `model3D` if provided in request body

## 5.2 Custom order writes

### Create custom order

Endpoint: `POST /api/custom-orders`
File: `app/api/custom-orders/route.js`

Writes:

1. `model3D: body.model3D || null`

### Update custom order (draft only)

Endpoint: `PUT /api/custom-orders/[id]`
File: `app/api/custom-orders/[id]/route.js`

Writes:

1. Allows `model3D` in the allowed field list
2. Uses `findByIdAndUpdate(..., runValidators: true)`

## 5.3 Order writes from RFQ flow

Endpoint: `POST /api/rfqs/[id]/accept-bid`
File: `app/api/rfqs/[id]/accept-bid/route.js`

Writes during order creation:

1. `productDetails.specifications.model3D = customOrder.model3D`
2. `designFiles = customOrder.model3D?.url ? [customOrder.model3D.url] : []`

## 6. 3D Metadata Read/Access Paths

## 6.1 Product readers

1. `GET /api/products` (manufacturer list, returns product docs)
2. `GET /api/products/[id]` (auth required)
3. `GET /api/products/public` (public listing)
4. `GET /api/products/[id]/public` (public detail)

These responses can include `product.model3D` unless a route explicitly selects fields excluding it.

## 6.2 Custom-order readers

1. `GET /api/custom-orders`
2. `GET /api/custom-orders/[id]`

Both expose stored `customOrder.model3D` when present.

## 6.3 RFQ readers

1. `GET /api/rfqs`
2. `GET /api/rfqs/[id]`

Both populate `customOrderId` with selected fields that include `model3D`.

## 6.4 Bid reader with RFQ context

1. `GET /api/bids/[id]`

This route populates `rfqId.customOrderId`, so `model3D` from custom order is available through bid details.

## 6.5 Order readers

1. `GET /api/orders`
2. `GET /api/orders/[id]`

These return order documents, including RFQ-derived `designFiles` and `productDetails` snapshots.

## 7. Frontend Entry Points (How backend gets called)

Even though this document focuses on backend/DB, these are the UI entry points that trigger 3D backend writes:

1. `app/custom-orders/new/page.js`
2. `app/custom-orders/[id]/edit/page.js`
3. `app/manufacturer/products/new/page.js`
4. `app/manufacturer/products/[id]/edit/page.js`

Viewer/read consumers:

1. `app/custom-orders/[id]/review/page.js` (`model-viewer`)
2. `app/customer/rfqs/[id]/page.js` (`model-viewer`)
3. `app/manufacturer/rfqs/[id]/page.js` (`model-viewer`)
4. Product detail pages show file metadata and open/download URL

## 8. Authentication and DB Access Layers

## 8.1 DB connection

File: `lib/mongodb.js`

1. Uses `MONGODB_URI`
2. Caches mongoose connection globally (`global.mongoose`) to avoid reconnect churn

## 8.2 Session resolution

File: `lib/requestAuth.js`

`resolveRequestSession(request)` checks:

1. Bearer token (`Authorization: Bearer ...`) via mobile token verifier
2. NextAuth session (cookie/session strategy)

Most 3D write routes require this session resolver.

## 9. Integration Contract for External Python Backend

If your friend wants to integrate an existing Python 3D service, there are two integration styles.

## 9.1 Style A: Keep CraftIt upload routes

1. Python/client uploads to CraftIt `/api/upload` with `type=3d-model`
2. Store returned metadata object directly into `model3D`
3. Use CraftIt APIs for Product/CustomOrder create/update

Pros:

1. Minimal schema change
2. Existing RFQ/order propagation continues working

## 9.2 Style B: Keep Python file pipeline, only push metadata into CraftIt

1. Python service stores/converts models elsewhere (S3, GCS, etc.)
2. Python sends CraftIt-compatible `model3D` payload in Product/CustomOrder APIs

Minimum required payload for compatibility:

```json
{
  "model3D": {
    "url": "https://...",
    "filename": "model.glb",
    "fileSize": 1234567
  }
}
```

Optional for custom orders:

```json
{
  "model3D": {
    "url": "https://...",
    "filename": "model.glb",
    "fileSize": 1234567,
    "dimensions": {
      "length": 100,
      "width": 50,
      "height": 40,
      "unit": "mm"
    }
  }
}
```

## 10. Known Gaps and Mismatches (Important)

## 10.1 Not implemented in current backend/db

1. Pin/annotation/hotspot persistence
2. Camera pose persistence
3. Pan/zoom/rotate state persistence
4. Server-side conversion pipeline (STL/OBJ -> GLTF/GLB)
5. Mesh processing/validation metadata

## 10.2 Implementation mismatches to be aware of

1. README uses `AWS_S3_BUCKET_NAME`, but upload code uses `AWS_BUCKET_NAME`.
2. `app/manufacturer/products/new/page.js` and `app/manufacturer/products/[id]/edit/page.js` call `/api/upload` without `type` and expect `data.url`, while `/api/upload` requires `type` and returns `data.file.url`.
3. Same product pages expect `data.urls` from `/api/upload/multiple`, but backend returns `data.files`.
4. Comment in `app/api/upload/route.js` says `/api/upload/multiple` although file is `/api/upload`.

These should be normalized before or during integration to avoid silent upload failures.

## 11. Seed Data Behavior

File: `scripts/seedDatabase.js`

Current seed script intentionally disables:

1. Product `model3D` seeding
2. CustomOrder `model3D` seeding
3. RFQ order `designFiles` seeding

So dev databases may look like 3D is unused unless you upload real files.

## 12. Quick Reference: Where 3D data lives now

1. Binary file: AWS S3 object key under folder prefix (`3d-models/...`)
2. Product metadata: `products.model3D`
3. Custom order metadata: `customorders.model3D`
4. RFQ access: through `rfqs.customOrderId -> customorders.model3D`
5. Accepted RFQ order snapshot: `orders.productDetails.specifications.model3D`
6. Accepted RFQ order file list: `orders.designFiles[]`

---

If you want, a follow-up doc can be added that defines a target schema for your friend's advanced 3D features (pins, annotations, conversion outputs, and camera states) in a backward-compatible way with current CraftIt routes.
