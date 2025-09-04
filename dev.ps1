param([string]$cmd = "up")
switch ($cmd) {

    "up" {
        Write-Host "Starting containers..."
        docker compose up --build
    }

    "down" {
        Write-Host "Stopping containers..."
        docker compose down -v
    }

    "migrate" {
        Write-Host "Running Prisma migrations..."
        docker compose exec nest_api npx prisma migrate deploy
    }

    "generate" {
        Write-Host "Generating Prisma client..."
        docker compose exec nest_api npx prisma generate
    }

    "studio" {
        Write-Host "Opening Prisma Studio..."
        docker compose exec nest_api npx prisma studio
    }

    "bash" {
        Write-Host "Opening bash shell in API container..."
        docker compose exec nest_api bash
    }

    "logs" {
        Write-Host "Tailing logs..."
        docker compose logs -f nest_api
    }

    default {
        Write-Host "Unknown command: $cmd"
        Write-Host "Available commands: up, down, migrate, generate, studio, bash, logs"
    }
}
