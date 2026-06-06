# Realtime Quiz App

Веб-приложение для проведения квизов в реальном времени. Организатор создаёт и публикует квиз, запускает комнату и управляет ходом игры. Участники подключаются по коду комнаты, отвечают на вопросы и после завершения видят итоговый рейтинг.

Проект ориентирован на учебные мероприятия, корпоративное обучение и интеллектуальные игры.

## Возможности

- регистрация и JWT-аутентификация;
- роли организатора и участника;
- создание, редактирование и публикация квизов;
- вопросы с одним или несколькими правильными ответами;
- изображения в вопросах;
- фиксированное и зависящее от времени начисление баллов;
- перемешивание вопросов и вариантов ответов;
- комнаты с коротким кодом подключения;
- синхронизация состояния через Socket.IO;
- серверная проверка ответов и ограничение повторной отправки;
- автоматическое закрытие вопроса по таймеру;
- рейтинг и итоговые результаты;
- поддержка позднего подключения к активной сессии.

## Стек технологий

### Frontend

- **React 19 + TypeScript** — компонентный интерфейс со строгой типизацией данных API и Socket.IO.
- **Vite** — быстрый dev-сервер и компактная production-сборка.
- **React Router** — разделение публичных страниц и страниц организатора/участника.
- **Tailwind CSS** — стилизация без добавления отдельной UI-библиотеки.
- **Socket.IO Client** — двусторонняя синхронизация комнаты, вопросов и результатов.
- **Nginx** — раздача production-сборки и проксирование API/WebSocket в Docker.

### Backend

- **Node.js + Express + TypeScript** — простой HTTP API с общей типизированной кодовой базой.
- **Socket.IO** — доставка событий комнаты с поддержкой переподключения и fallback-транспорта.
- **Prisma ORM** — типизированный доступ к PostgreSQL, миграции и seed-данные.
- **PostgreSQL 17** — транзакционное хранение пользователей, квизов, ответов и результатов.
- **JWT** — stateless-аутентификация HTTP и Socket.IO соединений.
- **Zod** — проверка переменных окружения и входных данных.
- **bcrypt** — безопасное хеширование паролей.

### Почему выбраны эти технологии

React и TypeScript подходят для интерфейса с большим количеством связанных состояний: текущий вопрос, таймер, подключение и результаты. Vite упрощает разработку и сборку SPA.

Express оставляет backend небольшим и прозрачным для MVP, а Socket.IO решает задачи комнат, broadcast-событий и восстановления соединения без ручной реализации WebSocket-протокола.

PostgreSQL обеспечивает ограничения целостности и транзакции, необходимые при одновременной отправке ответов. Prisma синхронизирует модели TypeScript со схемой БД и даёт воспроизводимые миграции.

Docker Compose объединяет БД, миграции, backend и frontend в один воспроизводимый сценарий запуска. Для разработки и временного размещения на VPS используются отдельные Compose-файлы.

## Быстрый локальный запуск через Docker

Требования:

- Docker Desktop или Docker Engine;
- Docker Compose.

Из корня проекта выполните:

```bash
docker compose up --build -d
```

После запуска приложение доступно по адресу:

```text
http://localhost:5173
```

Compose последовательно:

1. запускает PostgreSQL;
2. ожидает успешный health-check БД;
3. применяет Prisma migrations и выполняет idempotent demo seed;
4. запускает backend;
5. запускает frontend через Nginx.

Просмотр состояния и логов:

```bash
docker compose ps
docker compose logs -f
```

Остановка:

```bash
docker compose down
```

Остановка с удалением данных PostgreSQL:

```bash
docker compose down -v
```

### Demo-пользователи

После seed доступны:

```text
Организатор: organizer@example.com / password123
Участник:    participant@example.com / password123
```

## Временный деплой на VPS по IP

Для временной публикации используется `compose.prod.yaml`. Приложение доступно
напрямую по адресу:

```text
http://IP_СЕРВЕРА
```

Отдельный Nginx на VPS и домен не требуются. Nginx внутри frontend-контейнера:

- раздаёт production-сборку Vite;
- поддерживает SPA fallback;
- проксирует `/api/` на backend;
- проксирует `/socket.io/` с поддержкой WebSocket Upgrade.

Backend и PostgreSQL доступны только внутри Docker network.

Создайте корневой `.env`:

```bash
cp .env.example .env
chmod 600 .env
nano .env
```

Укажите публичный IP и замените секреты:

```env
APP_URL=http://IP_СЕРВЕРА
APP_PORT=80

POSTGRES_DB=realtime_quiz_app
POSTGRES_USER=quiz_app
POSTGRES_PASSWORD=СЛУЧАЙНЫЙ_URL_SAFE_ПАРОЛЬ

JWT_SECRET=СЛУЧАЙНАЯ_СТРОКА_НЕ_КОРОЧЕ_32_СИМВОЛОВ
JWT_EXPIRES_IN=7d
```

Секреты можно сгенерировать командой:

```bash
openssl rand -hex 32
```

Запуск:

```bash
docker compose --env-file .env -f compose.prod.yaml \
  up --build -d --wait
```

Проверка:

```bash
docker compose --env-file .env -f compose.prod.yaml ps
curl http://127.0.0.1/health
curl http://127.0.0.1/api/health
```

Это временная HTTP-конфигурация без TLS: логины, пароли и JWT передаются по сети
без шифрования. Не используйте её для постоянного публичного размещения или
реальных пользовательских данных.

## Локальный запуск

Требования:

- Node.js 22 или новее;
- npm;
- PostgreSQL 16/17.

### Backend

Создайте `backend/.env` на основе `backend/.env.example`, затем:

```bash
cd backend
npm install
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
npm run dev
```

Backend будет доступен на `http://localhost:3000`.

### Frontend

Создайте `frontend/.env` на основе `frontend/.env.example`, затем в отдельном терминале:

```bash
cd frontend
npm install
npm run dev
```

Frontend будет доступен на `http://localhost:5173`.

Проверки проекта:

```bash
cd backend
npm run build

cd ../frontend
npm run lint
npm run build
```

## Конфигурация

### Локальный Docker Compose

Значения можно задать в корневом `.env` или передать как переменные окружения.

| Переменная | Значение по умолчанию | Назначение |
| --- | --- | --- |
| `APP_PORT` | `5173` | Порт приложения на хосте |
| `APP_URL` | `http://localhost:5173` | Разрешённый origin frontend для CORS |
| `POSTGRES_PORT` | `5432` | Порт PostgreSQL на хосте |
| `POSTGRES_DB` | `realtime_quiz_app` | Название базы данных |
| `POSTGRES_USER` | `quiz_app` | Пользователь PostgreSQL |
| `POSTGRES_PASSWORD` | `quiz_app_password` | Пароль PostgreSQL |
| `JWT_SECRET` | development-значение | Секрет подписи JWT, в production обязательно заменить |
| `JWT_EXPIRES_IN` | `7d` | Время жизни JWT |

Пример запуска с другими портами:

```powershell
$env:APP_PORT="8080"
$env:APP_URL="http://localhost:8080"
$env:POSTGRES_PORT="55432"
docker compose up --build -d
```

### Production Docker Compose

Файл `compose.prod.yaml` требует корневой `.env` на основе `.env.example`.

| Переменная | Назначение |
| --- | --- |
| `APP_URL` | Публичный origin, например `http://203.0.113.10`, без завершающего `/` |
| `APP_PORT` | Публичный HTTP-порт frontend Nginx, обычно `80` |
| `POSTGRES_DB` | Название базы данных |
| `POSTGRES_USER` | Пользователь PostgreSQL |
| `POSTGRES_PASSWORD` | Случайный URL-safe пароль PostgreSQL |
| `JWT_SECRET` | Случайный JWT-секрет длиной не менее 32 символов |
| `JWT_EXPIRES_IN` | Время жизни JWT, по умолчанию `7d` |

В production:

- наружу публикуется только frontend Nginx на `APP_PORT`;
- backend слушает `3000` только внутри Docker network;
- PostgreSQL слушает `5432` только внутри Docker network;
- миграции применяются командой `prisma migrate deploy`;
- demo seed автоматически не выполняется.

### Backend

Файл: `backend/.env`.

| Переменная | Описание |
| --- | --- |
| `NODE_ENV` | `development`, `test` или `production` |
| `PORT` | HTTP/Socket.IO порт backend |
| `DATABASE_URL` | PostgreSQL connection string для Prisma |
| `JWT_SECRET` | Секрет JWT длиной не менее 32 символов |
| `JWT_EXPIRES_IN` | Время жизни токена, например `7d` |
| `FRONTEND_URL` | Разрешённый CORS origin |

### Frontend

Файл: `frontend/.env`.

| Переменная | Описание |
| --- | --- |
| `VITE_API_URL` | URL REST API, например `http://localhost:3000/api` |
| `VITE_SOCKET_URL` | URL Socket.IO, например `http://localhost:3000` |

В Docker frontend использует относительные `/api` и `/socket.io`. Поэтому
браузер обращается к тому же `localhost` или IP сервера, с которого загружено
приложение, а frontend Nginx проксирует запросы в контейнер backend.

## Health-checks

- PostgreSQL: `pg_isready`;
- backend: `GET /api/health`, включая запрос к БД;
- frontend: `GET /health` через Nginx.

Проверка backend вручную:

```bash
curl http://localhost:3000/api/health
```

При Docker-запуске backend доступен браузеру через frontend proxy:

```bash
curl http://localhost:5173/api/health
```

При production-запуске на VPS:

```bash
curl http://IP_СЕРВЕРА/api/health
```

## Основные routes сайта

| Route | Доступ | Назначение |
| --- | --- | --- |
| `/` | Все | Перенаправление на домашнюю страницу роли |
| `/login` | Гость | Вход |
| `/register` | Гость | Регистрация |
| `/organizer` | Организатор/Admin | Панель и список квизов |
| `/organizer/quizzes` | Организатор/Admin | Полный список квизов |
| `/organizer/quizzes/new` | Организатор/Admin | Создание квиза |
| `/organizer/quizzes/:quizId/questions` | Организатор/Admin | Редактор вопросов |
| `/organizer/sessions` | Организатор/Admin | История проведённых сессий |
| `/organizer/rooms/:roomId/lobby` | Организатор/Admin | Лобби комнаты |
| `/organizer/rooms/:roomId/live` | Организатор/Admin | Управление активным квизом |
| `/participant/join` | Участник | Подключение по коду |
| `/participant/rooms/:roomId/lobby` | Участник | Ожидание начала |
| `/participant/rooms/:roomId/question` | Участник | Текущий вопрос |
| `/results/:roomId` | Авторизованный пользователь | Итоговый рейтинг |

## Основные REST API routes

Все маршруты имеют префикс `/api`.

### Authentication

| Метод | Route | Назначение |
| --- | --- | --- |
| `POST` | `/auth/register` | Регистрация |
| `POST` | `/auth/login` | Получение JWT |
| `GET` | `/auth/me` | Текущий пользователь |
| `PATCH` | `/auth/me` | Изменение имени текущего пользователя |

### Quizzes

| Метод | Route | Назначение |
| --- | --- | --- |
| `GET` | `/quizzes` | Список доступных квизов |
| `POST` | `/quizzes` | Создание квиза |
| `GET` | `/quizzes/:quizId` | Квиз с вопросами |
| `PATCH` | `/quizzes/:quizId` | Изменение/публикация квиза |
| `DELETE` | `/quizzes/:quizId` | Удаление квиза |
| `POST` | `/quizzes/:quizId/questions` | Добавление вопроса |
| `PATCH` | `/quizzes/:quizId/questions/:questionId` | Изменение вопроса |
| `DELETE` | `/quizzes/:quizId/questions/:questionId` | Удаление вопроса |
| `POST` | `/quizzes/:quizId/sessions` | Создание или получение активной сессии |

### Sessions

| Метод | Route | Назначение |
| --- | --- | --- |
| `GET` | `/sessions/code/:roomCode` | Поиск комнаты |
| `POST` | `/sessions/code/:roomCode/join` | Подключение участника |
| `GET` | `/sessions/:sessionId` | Состояние сессии |
| `POST` | `/sessions/:sessionId/start` | Запуск квиза |
| `POST` | `/sessions/:sessionId/questions/close` | Закрытие ответов |
| `POST` | `/sessions/:sessionId/questions/show-answer` | Показ правильного ответа |
| `POST` | `/sessions/:sessionId/questions/next` | Следующий вопрос |
| `POST` | `/sessions/:sessionId/answers` | Отправка ответа |
| `POST` | `/sessions/:sessionId/finish` | Завершение |
| `POST` | `/sessions/:sessionId/cancel` | Отмена |
| `GET` | `/sessions/:sessionId/results` | Итоговый рейтинг |

JWT передаётся в заголовке:

```text
Authorization: Bearer <token>
```

Socket.IO работает на том же backend и принимает JWT в handshake:

```ts
io(url, { auth: { token } });
```

## Структура проекта

```text
realtime-quiz-app/
├── backend/
│   ├── prisma/
│   │   ├── migrations/       # SQL-миграции Prisma
│   │   ├── schema.prisma     # Модели PostgreSQL
│   │   └── seed.ts           # Demo-данные
│   ├── src/
│   │   ├── config/           # Env и Prisma Client
│   │   ├── middleware/       # Auth, роли, обработка ошибок
│   │   ├── modules/
│   │   │   ├── auth/         # Регистрация и вход
│   │   │   ├── quizzes/      # CRUD квизов и вопросов
│   │   │   └── sessions/     # Комнаты, ответы, баллы, результаты
│   │   ├── socket/           # Socket.IO server и события сессий
│   │   ├── utils/            # JWT, пароли, общие ошибки
│   │   ├── app.ts            # Express app и REST routes
│   │   └── server.ts         # HTTP/Socket.IO server
│   └── Dockerfile
├── frontend/
│   ├── public/               # Статические ресурсы
│   ├── src/
│   │   ├── api/              # REST API client
│   │   ├── app/              # Router и корневой App
│   │   ├── auth/             # Auth context и protected routes
│   │   ├── components/       # UI, layout и quiz-компоненты
│   │   ├── hooks/            # Socket.IO session hook
│   │   ├── pages/            # Страницы организатора и участника
│   │   ├── socket/           # Socket.IO client
│   │   ├── styles/           # Глобальные стили
│   │   └── types/            # TypeScript-типы
│   ├── Dockerfile
│   └── nginx.conf
├── docs/                     # Проектная документация
├── .env.example              # Пример production-переменных
├── compose.yaml              # Локальный Docker-запуск с demo seed
├── compose.prod.yaml         # Production-запуск по IP без demo seed
├── DEPLOY.md                 # Инструкция временного VPS-деплоя
└── README.md
```

## Основные сущности БД

- `User`;
- `QuizCategory`;
- `Quiz`;
- `Question`;
- `AnswerOption`;
- `QuizSession`;
- `SessionParticipant`;
- `ParticipantAnswer`;
- `SessionResult`;
- `SessionEvent`.

Данные PostgreSQL в Docker хранятся в named volume `postgres_data`.
