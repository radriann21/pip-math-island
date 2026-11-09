import { useNavigate } from 'react-router-dom';
import { StickersContainer } from '../containers/StickersContainer';
import { PageShell } from './PageShell';

export function StickersPage() {
  const navigate = useNavigate();
  return (
    <PageShell titleKey="page.stickers" onBack={() => navigate('/')}>
      <StickersContainer />
    </PageShell>
  );
}
