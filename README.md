# fiance-dashboard

This is a project for managing personal assets =D

## Development Guide

### Backend
To start the backend, navigate to the backend directory, install dependencies from requirements.txt, and run the development server:

```bash
$ cd backend
$ pip install -r requirements.txt
$ python3 -m uvicorn main:app --reload
```

### Frontend

#### Prerequisites
Before starting with the frontend development, ensure you have the following installed:
- **Node.js** (version 18 or higher) - Download from [nodejs.org](https://nodejs.org/)
- **npm** (comes with Node.js) or **yarn** (optional alternative package manager)

You can check if Node.js and npm are installed by running:
```bash
node --version
npm --version
```

#### Installing Angular CLI
Angular CLI is a command-line interface tool that helps with Angular development. Install it globally:
```bash
npm install -g @angular/cli
```

#### Setting Up the Frontend Environment
1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install all the required dependencies:
   ```bash
   npm install
   ```

   This will install all the packages listed in `package.json`, including:
   - **Angular core packages** (`@angular/core`, `@angular/common`, etc.) - The main framework for building the application
   - **NgRx** (`@ngrx/store`, `@ngrx/effects`, etc.) - State management library for Angular
   - **ECharts** and **ngx-echarts** - Charting library for data visualization
   - **RxJS** - Reactive programming library
   - **TypeScript** - Programming language that compiles to JavaScript
   - **Vitest** - Testing framework
   - **Prettier** - Code formatter

#### Running the Development Server
To start the development server with hot reload:
```bash
npm start
```
or
```bash
ng serve
```

The application will be available at `http://localhost:4200` by default.

**Note:** The development server automatically proxies API requests to the backend server running on port 8000. Make sure the backend is running before starting the frontend development server.

#### Building for Production
To build the application for production:
```bash
npm run build
```
or
```bash
ng build
```

The built files will be in the `dist/` directory.


#### Code Formatting
The project uses Prettier for code formatting. To format your code:
```bash
npx prettier --write .
```

## Technology Stack

### Backend
- Python

### Frontend
- TypeScript
- Angular