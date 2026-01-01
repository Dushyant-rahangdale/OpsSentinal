---
description: Reset Database and Docker Containers
---
// turbo-all

1. Stop and remove docker containers and volumes
```powershell
docker-compose -f docker-compose.dev.yml down -v --remove-orphans
```

2. Start db container
```powershell
docker-compose -f docker-compose.dev.yml up -d
```

3. Wait for DB to be ready (sleep 10s)
```powershell
Start-Sleep -Seconds 10
```

4. Run migrations
```powershell
npx prisma migrate dev --name init_reset
```

5. Run seed
```powershell
npx prisma db seed
```
