import { Router, Route } from 'grainlet/route';
import { ProtectedRoute } from 'grainlet/auth';
import { AppChrome } from './chrome/AppChrome.jsx';
import { NotFoundPage } from './chrome/NotFoundPage.jsx';
import { SignInPage } from './pages/auth/SignInPage.jsx';
import { SignUpPage } from './pages/auth/SignUpPage.jsx';
import { ForgotPasswordPage } from './pages/auth/ForgotPasswordPage.jsx';
import { ResetPasswordPage } from './pages/auth/ResetPasswordPage.jsx';
import { VerifyPage } from './pages/auth/VerifyPage.jsx';
import { VerifyPendingPage } from './pages/auth/VerifyPendingPage.jsx';
import { HomePage } from './pages/home/HomePage.jsx';
import { ExplorePage } from './pages/explore/ExplorePage.jsx';
import { QuizPage } from './pages/quiz/QuizPage.jsx';
import { TermsPage } from './pages/legal/TermsPage.jsx';
import { PrivacyPage } from './pages/legal/PrivacyPage.jsx';
import { ContactPage } from './pages/legal/ContactPage.jsx';
import { CookiesPage } from './pages/legal/CookiesPage.jsx';
import { PopularTripsPage } from './pages/popular/PopularTripsPage.jsx';
import { PopularBrowsePage } from './pages/popular/PopularBrowsePage.jsx';
import { PopularTripPage } from './pages/popular/PopularTripPage.jsx';
import { PlanPage } from './pages/plan/PlanPage.jsx';
import { SharedPlanPage } from './pages/plan/SharedPlanPage.jsx';
import { TripsPage } from './pages/trips/TripsPage.jsx';
import { SettingsPage } from './pages/settings/SettingsPage.jsx';
import { AdminHomePage } from './pages/admin/AdminHomePage.jsx';
import { AdminImagesPage } from './pages/admin/AdminImagesPage.jsx';
import { AdminAiEnrichmentPage } from './pages/admin/AdminAiEnrichmentPage.jsx';
import { AdminArticleImportPage } from './pages/admin/AdminArticleImportPage.jsx';
import { AdminArticleImportRunsPage } from './pages/admin/AdminArticleImportRunsPage.jsx';
import { AdminArticleImportRunPage } from './pages/admin/AdminArticleImportRunPage.jsx';
import { AdminCityCreatePage } from './pages/admin/AdminCityCreatePage.jsx';
import { AdminUsersPage } from './pages/admin/AdminUsersPage.jsx';
import { AdminEntitiesPage } from './pages/admin/AdminEntitiesPage.jsx';
import { AdminEntityPage } from './pages/admin/AdminEntityPage.jsx';
import { AdminEntityEditPage } from './pages/admin/AdminEntityEditPage.jsx';

function guard(Page) {
  return function GuardedPage() {
    return (
      <ProtectedRoute
        redirectTo="/"
        preserveCallback={false}
        loadingFallback={<p class="px-4 py-6 text-sm text-text-secondary">Loading session…</p>}
      >
        <Page />
      </ProtectedRoute>
    );
  };
}

export function App() {
  return (
    <AppChrome>
      <Router>
        <Route path="/" component={HomePage} />
        <Route path="/explore" component={ExplorePage} />
        <Route path="/quiz" component={QuizPage} />
        <Route path="/terms" component={TermsPage} />
        <Route path="/privacy" component={PrivacyPage} />
        <Route path="/contact" component={ContactPage} />
        <Route path="/cookies" component={CookiesPage} />
        <Route path="/auth/signin" component={SignInPage} />
        <Route path="/auth/signup" component={SignUpPage} />
        <Route path="/auth/forgot-password" component={ForgotPasswordPage} />
        <Route path="/auth/reset-password" component={ResetPasswordPage} />
        <Route path="/auth/verify" component={VerifyPage} />
        <Route path="/auth/verify-pending" component={VerifyPendingPage} />
        <Route path="/popular-trips" component={PopularTripsPage} />
        <Route path="/popular-trips/browse" component={PopularBrowsePage} />
        <Route path="/popular-trips/*" component={PopularTripPage} />
        <Route path="/plan/shared/*" component={SharedPlanPage} />
        <Route path="/plan/:id" component={PlanPage} />
        <Route path="/trips" component={guard(TripsPage)} />
        <Route path="/settings" component={guard(SettingsPage)} />
        <Route path="/admin" component={guard(AdminHomePage)} />
        <Route path="/admin/images" component={guard(AdminImagesPage)} />
        <Route path="/admin/ai-enrichment" component={guard(AdminAiEnrichmentPage)} />
        <Route path="/admin/article-import" component={guard(AdminArticleImportPage)} />
        <Route path="/admin/article-import/runs" component={guard(AdminArticleImportRunsPage)} />
        <Route path="/admin/article-import/runs/:runId" component={guard(AdminArticleImportRunPage)} />
        <Route path="/admin/cities/create" component={guard(AdminCityCreatePage)} />
        <Route path="/admin/users" component={guard(AdminUsersPage)} />
        <Route path="/admin/entities" component={guard(AdminEntitiesPage)} />
        <Route path="/admin/entities/:entityKey/new" component={guard(AdminEntityEditPage)} />
        <Route path="/admin/entities/:entityKey" component={guard(AdminEntityPage)} />
        <Route path="/admin/entities/:entityKey/:recordId" component={guard(AdminEntityEditPage)} />
        <Route path="*" component={NotFoundPage} />
      </Router>
    </AppChrome>
  );
}
