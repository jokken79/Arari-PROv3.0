# GEMINI.md - 粗利 PRO v2.0

## Project Overview

**粗利 PRO (Arari PRO)** is a full-stack web application designed as a **Profit Margin Management System for Dispatch Employees (派遣社員利益管理システム)**. It provides a dashboard to visualize and analyze the profitability of dispatched employees, with a focus on the manufacturing dispatch industry.

The application allows users to upload Excel-based payroll statements, automatically parses them, calculates profit margins based on configurable business rules, and presents the data through an interactive dashboard.

### Key Features

*   **Dashboard:** Real-time statistics, profit margin gauges, employee rankings, and various charts for data visualization.
*   **Data Analysis:** Monthly trend analysis, comparison between different periods, and detailed data tables.
*   **Excel Upload:** Automated parsing of payroll data from Excel files.
*   **Multi-instance Architecture:** The application is designed to run in multiple instances, as evidenced by the `docker-compose.generated.yml` file, allowing for scalability and tenant isolation.

### Architecture

The project follows a modern web architecture with a decoupled frontend and backend:

*   **Frontend:** A [Next.js](https://nextjs.org/) 14 application built with [TypeScript](https://www.typescriptlang.org/), using the App Router. It leverages [Tailwind CSS](https://tailwindcss.com/) for styling, [Recharts](https://recharts.org/) for charts, and [TanStack Query](https://tanstack.com/query/latest) for server state management.
*   **Backend:** A [FastAPI](https://fastapi.tiangolo.com/) (Python) application that serves a RESTful API. It uses a [SQLite](https://www.sqlite.org/index.html) database for data storage and [Pandas](https://pandas.pydata.org/)/[OpenPyXL](https://openpyxl.readthedocs.io/en/stable/) for Excel file processing.
*   **Database:** The application uses SQLite, with the database schema defined using Pydantic models in `arari-app/api/models.py`.
*   **Deployment:** The application is containerized using [Docker](https.docker.com/) and managed with [Docker Compose](https://docs.docker.com/compose/). The `docker-compose.generated.yml` file defines a multi-instance setup with separate frontend and backend services for each instance.

## Building and Running the Project

### Prerequisites

*   [Node.js](https://nodejs.org/) and [npm](https://www.npmjs.com/)
*   [Python](https://www.python.org/) and [pip](https://pip.pypa.io/en/stable/)
*   [Docker](https://www.docker.com/) and [Docker Compose](https://docs.docker.com/compose/)

### Running Locally (Single Instance)

#### Frontend

1.  Navigate to the `arari-app` directory:
    ```bash
    cd arari-app
    ```
2.  Install the dependencies:
    ```bash
    npm install
    ```
3.  Run the development server:
    ```bash
    npm run dev
    ```
    The frontend will be available at `http://localhost:3000`.

#### Backend

1.  Navigate to the `arari-app/api` directory:
    ```bash
    cd arari-app/api
    ```
2.  Install the Python dependencies:
    ```bash
    pip install -r requirements.txt
    ```
3.  Run the backend server:
    ```bash
    uvicorn main:app --reload --port 8000
    ```
    The backend API will be available at `http://localhost:8000`.

### Running with Docker (Multi-instance)

The `docker-compose.generated.yml` file is configured to run multiple instances of the application. To run the application using Docker, you can use the `docker-deploy.ps1` script or run `docker-compose` commands directly.

```powershell
# To start the containers
docker-compose -f docker-compose.generated.yml up -d

# To stop the containers
docker-compose -f docker-compose.generated.yml down
```

## Development Conventions

### Code Style

*   **Frontend (TypeScript/Next.js):** The code follows standard React and TypeScript conventions. The use of `clsx` and `tailwind-merge` suggests a focus on maintainable and consistent styling. The project uses the `lucide-react` library for icons.
*   **Backend (Python/FastAPI):** The backend code is well-structured, with a clear separation of concerns. It uses Pydantic models for data validation and follows the FastAPI best practices.

### State Management

*   **Frontend:** The application uses a combination of [TanStack Query](https://tanstack.com/query/latest) for managing server state and [Zustand](https://github.com/pmndrs/zustand) for client-side state management, as seen in `arari-app/src/app/page.tsx` and the `useAppStore` import.

### API Communication

*   The frontend communicates with the backend via a REST API. The `arari-app/src/lib/api.ts` file provides a typed API client for making requests to the backend.

### Testing

*   The `arari-app/package.json` file includes a `lint` script, suggesting the use of ESLint for code quality. There is also a `tests` directory in the `api` folder, but no testing framework is explicitly defined in the `requirements.txt`. It is recommended to add a testing framework like `pytest` to the backend and `jest` or `react-testing-library` to the frontend.

### Authentication

*   The application includes authentication, as indicated by the `AuthGuard` component in `arari-app/src/app/layout.tsx` and the `/api/auth` endpoints in the backend.

## File and Directory Overview

*   `arari-app/`: The main application directory, containing both the frontend and backend code.
    *   `api/`: The FastAPI backend.
        *   `main.py`: The main entry point for the backend API.
        *   `models.py`: Pydantic models for data validation.
        *   `services.py`: Business logic for the application.
        *   `database.py`: Database initialization and connection.
        *   `requirements.txt`: Backend dependencies.
    *   `src/`: The Next.js frontend.
        *   `app/`: The main application pages and layouts.
        *   `components/`: Reusable React components.
        *   `lib/`: Utility functions and the API client.
        *   `hooks/`: Custom React hooks for data fetching.
*   `docker-compose.generated.yml`: Docker Compose file for running multiple instances of the application.
*   `docker-deploy.ps1`: A PowerShell script for deploying the application with Docker.
*   `README.md`: The main project documentation.
