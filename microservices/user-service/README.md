# User Service

Microservicio de usuarios para la arquitectura de microservicios del ERP.

## Stack

- Node.js + Express
- JWT con `crypto` nativo
- Hash de contraseñas con `scrypt`
- PostgreSQL/Supabase vía REST

## Ejecutar

1. Copia `.env.example` a `.env` y completa tus variables.
2. Usa `USER_SERVICE_STORAGE=supabase` para Supabase o `memory` para pruebas rápidas.
3. Corre:

```bash
npm run start:user-service
```

## Endpoints

- `GET /api/v1/users/health`
- `POST /api/v1/users/auth/register`
- `POST /api/v1/users/auth/login`
- `GET /api/v1/users/permissions`
- `POST /api/v1/users/admin/users`
- `PATCH /api/v1/users/profile`
- `PATCH /api/v1/users/profile/password`
- `PUT /api/v1/users/:userId/permissions`

## Contrato JSON

Todas las respuestas siguen este esquema:

```json
{
  "statusCode": 200,
  "intOpCode": 0,
  "data": {
    "message": "Operación completada correctamente"
  }
}
```

## Pruebas sugeridas

- Login: `POST /api/v1/users/auth/login`
- Register: `POST /api/v1/users/auth/register`
- Permissions: `GET /api/v1/users/permissions` con `Bearer token`

## Base de datos

Ejecuta [schema.sql](/C:/Users/EdgarTM/OneDrive/Documentos/Downloads/ERP/ERP/microservices/user-service/sql/schema.sql) en Supabase/PostgreSQL para crear:

- `users`
- `permissions`
- `groups`
- `tickets`
- `user_permissions`
