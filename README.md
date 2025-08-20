# Natours API - NestJS Backend Service

## Description

A robust NestJS-based API service for a tourism application with advanced authentication, authorization, and role-based access control (RBAC).

## Features

- User Authentication
- JWT Token-based Security
- Role-Based Access Control (RBAC)
- Passport Integration
- RESTful API Endpoints
- Database Integration

## Prerequisites

- Node.js (v20 or higher)
- npm or yarn
- PostgreSQL

## Installation

```bash
# Install dependencies
npm install
```

## Configuration

1. Create `.env` file in root directory
2. Add required environment variables:

```env
DATABASE_URL=
JWT_SECRET=
JWT_EXPIRATION=
```

## Running the App

```bash
# development
npm run start

# watch mode
npm run start:dev

# production mode
npm run start:prod
```

## API Documentation

- Swagger UI: `/api/docs`
- API Base URL: `/api/v1`

## Authentication Endpoints

- POST `/auth/login`
- POST `/auth/register`
- POST `/auth/refresh-token`

## Authentication Middleware

### Request Headers

- `Authorization: Bearer <token>` - JWT access token
- `X-Refresh-Token: <token>` - Optional refresh token

### Response Format

```json
{
  "status": "success|error",
  "data": {},
  "message": "string"
}
```

### Error Handling

- 401: Unauthorized
- 403: Forbidden
- 422: Validation Error
- 429: Too Many Requests

### Rate Limiting

- 100 requests per IP per 15 minutes
- Applies to all authentication endpoints

## Main Features

- User Management
- Role Management
- Authentication Services
- Authorization Guards
- JWT Strategy Implementation
- Custom Decorators

## Todo Features

- Tests Integration
- Payment Webhooks
- Third-Party Sign-in
- Booking Service

## License

[MIT Licensed](LICENSE)
