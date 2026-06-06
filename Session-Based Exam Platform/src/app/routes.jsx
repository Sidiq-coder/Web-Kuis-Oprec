import { createBrowserRouter } from "react-router";
import ParticipantBiodata from "./components/participant/ParticipantBiodata";
import ThemeSelection from "./components/participant/ThemeSelection";
import ExamModule from "./components/participant/ExamModule";
import ProjectThemeSelection from "./components/participant/ProjectThemeSelection";
import ProjectModule from "./components/participant/ProjectModule";
import ExamComplete from "./components/participant/ExamComplete";
import WaitingRoom from "./components/participant/WaitingRoom";
import ParticipantFlowGuard from "./components/participant/ParticipantFlowGuard";
import ResultCheck from "./components/participant/ResultCheck";
import AdminDashboard from "./components/admin/AdminDashboard";
import ThemeManagement from "./components/admin/ThemeManagement";
import ProjectThemeManagement from "./components/admin/ProjectThemeManagement";
import QuestionManagement from "./components/admin/QuestionManagement";
import QuizSetupManagement from "./components/admin/QuizSetupManagement";
import ProjectSetupManagement from "./components/admin/ProjectSetupManagement";
import ParticipantMonitoring from "./components/admin/ParticipantMonitoring";
import EssayReview from "./components/admin/EssayReview";
import ProjectReview from "./components/admin/ProjectReview";
import ProjectCaseManagement from "./components/admin/ProjectCaseManagement";
import WaitingRoomManagement from "./components/admin/WaitingRoomManagement";
import AdminLogin from "./components/admin/AdminLogin";
import AdminGuard from "./components/admin/AdminGuard";
import OverallScores from "./components/admin/OverallScores";
import ParticipantResults from "./components/admin/ParticipantResults";
import Home from "./components/Home";
export const router = createBrowserRouter([
    {
        path: "/",
        element: (<ParticipantFlowGuard allowHome>
        <Home />
      </ParticipantFlowGuard>),
    },
    {
        path: "/login",
        Component: AdminLogin,
    },
    {
        path: "/cek-kelulusan",
        Component: ResultCheck,
    },
    // Participant Routes
    {
        path: "/participant/biodata",
        element: (<ParticipantFlowGuard>
        <ParticipantBiodata />
      </ParticipantFlowGuard>),
    },
    {
        path: "/participant/theme-selection",
        element: (<ParticipantFlowGuard>
        <ThemeSelection />
      </ParticipantFlowGuard>),
    },
    {
        path: "/participant/exam",
        element: (<ParticipantFlowGuard>
        <ExamModule />
      </ParticipantFlowGuard>),
    },
    {
        path: "/participant/waiting",
        element: (<ParticipantFlowGuard>
        <WaitingRoom />
      </ParticipantFlowGuard>),
    },
    {
        path: "/participant/project-theme",
        element: (<ParticipantFlowGuard>
        <ProjectThemeSelection />
      </ParticipantFlowGuard>),
    },
    {
        path: "/participant/project",
        element: (<ParticipantFlowGuard>
        <ProjectModule />
      </ParticipantFlowGuard>),
    },
    {
        path: "/participant/complete",
        element: (<ParticipantFlowGuard>
        <ExamComplete />
      </ParticipantFlowGuard>),
    },
    // Admin Routes
    {
        path: "/admin",
        element: (<AdminGuard>
        <AdminDashboard />
      </AdminGuard>),
    },
    {
        path: "/admin/quiz-setup",
        element: (<AdminGuard>
        <QuizSetupManagement />
      </AdminGuard>),
    },
    {
        path: "/admin/themes",
        element: (<AdminGuard>
        <QuizSetupManagement />
      </AdminGuard>),
    },
    {
        path: "/admin/questions",
        element: (<AdminGuard>
        <QuizSetupManagement />
      </AdminGuard>),
    },
    {
        path: "/admin/project-setup",
        element: (<AdminGuard>
        <ProjectSetupManagement />
      </AdminGuard>),
    },
    {
        path: "/admin/project-themes",
        element: (<AdminGuard>
        <ProjectSetupManagement />
      </AdminGuard>),
    },
    {
        path: "/admin/project-cases",
        element: (<AdminGuard>
        <ProjectSetupManagement />
      </AdminGuard>),
    },
    {
        path: "/admin/monitoring",
        element: (<AdminGuard>
        <ParticipantMonitoring />
      </AdminGuard>),
    },
    {
        path: "/admin/waiting-room",
        element: (<AdminGuard>
        <WaitingRoomManagement />
      </AdminGuard>),
    },
    {
        path: "/admin/essay-review",
        element: (<AdminGuard>
        <EssayReview />
      </AdminGuard>),
    },
    {
        path: "/admin/project-review",
        element: (<AdminGuard>
        <ProjectReview />
      </AdminGuard>),
    },
    {
        path: "/admin/overall-scores",
        element: (<AdminGuard>
        <OverallScores />
      </AdminGuard>),
    },
    {
        path: "/admin/participant-results",
        element: (<AdminGuard>
        <ParticipantResults />
      </AdminGuard>),
    },
]);
