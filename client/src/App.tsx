import { Switch, Route, useLocation } from "wouter";
import { useEffect } from "react";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ErrorBoundary } from "@/components/error-boundary";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { ScrollToTop } from "@/components/scroll-to-top";
import Home from "@/pages/home";
import Browse from "@/pages/browse";
import AnimeDetail from "@/pages/anime-detail";
import Watch from "@/pages/watch";
import Trending from "@/pages/trending";
import Bookmarks from "@/pages/bookmarks";
import History from "@/pages/history";
import Login from "@/pages/login";
import Profile from "@/pages/profile";
import Support from "@/pages/support";
import Genres from "@/pages/genres";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/browse" component={Browse} />
      <Route path="/anime/:id" component={AnimeDetail} />
      <Route path="/watch/:animeId/:episodeNum" component={Watch} />
      <Route path="/trending" component={Trending} />
      <Route path="/bookmarks" component={Bookmarks} />
      <Route path="/history" component={History} />
      <Route path="/login" component={Login} />
      <Route path="/profile" component={Profile} />
      <Route path="/support" component={Support} />
      <Route path="/genres" component={Genres} />
      <Route component={NotFound} />
    </Switch>
  );
}

function ScrollReset() {
  const [location] = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location]);
  return null;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <ErrorBoundary>
          <div className="min-h-screen bg-background text-foreground">
            <ScrollReset />
            <Header />
            <main className="page-transition">
              <ErrorBoundary>
                <Router />
              </ErrorBoundary>
            </main>
            <Footer />
            <ScrollToTop />
          </div>
        </ErrorBoundary>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
