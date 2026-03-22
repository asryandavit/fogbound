# FOGBOUND — NestJS Prompt Templates

## Global Rules
Always check generated files for TypeScript errors
and fix them before finishing.
Always check generated files for ESLint errors
and fix them before finishing.
Project uses module: node16, moduleResolution: node16
strictNullChecks: true, NestJS 11, TypeScript 5.9.x
ESLint with prettier is configured in the project.

## Template 1 — Create Service
---
Fill src/MODULE/MODULE.service.ts

Requirements:
- Is Injectable
- Constructor injects DatabaseService
- Use this.databaseService.db for all queries
- Use drizzle-orm eq, and, ne, desc, asc as needed
- Throw NotFoundException, ConflictException, 
  BadRequestException from @nestjs/common as needed
- All methods are async
- Fix any TypeScript errors before finishing
---

## Template 2 — Create Controller
---
Fill src/MODULE/MODULE.controller.ts

Requirements:
- @Controller('ROUTE') decorator
- @UseGuards(JwtAuthGuard) on class level
- Import JwtAuthGuard from ../auth/jwt-auth.guard
- req.user shape: { playerId: string, username: string }
- Use @Request() req typed explicitly as above
- All methods are async
- Fix any TypeScript errors before finishing
---

## Template 3 — Create Module
---
Fill src/MODULE/MODULE.module.ts

Requirements:
- imports: DatabaseModule, AuthModule
- controllers: [MODULEController]
- providers: [MODULEService]
- exports: [MODULEService]
- Fix any TypeScript errors before finishing