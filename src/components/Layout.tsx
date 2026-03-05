import TopNav from './TopNav';

interface LayoutProps {
  children: React.ReactNode;
  currentPath: string;
  navigate: (path: string) => void;
}

export default function Layout({ children, currentPath, navigate }: LayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      <TopNav currentPath={currentPath} navigate={navigate} />
      <main className="min-h-[calc(100vh-3.5rem)]">
        {children}
      </main>
    </div>
  );
}
