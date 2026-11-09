import { ChildrenContainer } from '../containers/ChildrenContainer';
import { SessionActions } from '../containers/SessionActions';
import { PageShell } from './PageShell';

export function ChildrenPage() {
  return (
    <PageShell titleKey="page.children" actions={<SessionActions />}>
      <ChildrenContainer />
    </PageShell>
  );
}
