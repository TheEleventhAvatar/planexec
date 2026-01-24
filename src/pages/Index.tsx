import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWorkflows } from '@/hooks/use-workflow';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Brain, Play, Clock, CheckCircle, XCircle, Loader2, Trash2 } from 'lucide-react';
import type { WorkflowStatus } from '@/types/workflow';

const statusConfig: Record<WorkflowStatus, { color: string; icon: typeof Clock }> = {
  pending: { color: 'bg-muted text-muted-foreground', icon: Clock },
  running: { color: 'bg-blue-100 text-blue-700', icon: Loader2 },
  completed: { color: 'bg-green-100 text-green-700', icon: CheckCircle },
  failed: { color: 'bg-red-100 text-red-700', icon: XCircle },
  paused: { color: 'bg-amber-100 text-amber-700', icon: Clock },
};

export default function Index() {
  const [goal, setGoal] = useState('');
  const [isStarting, setIsStarting] = useState(false);
  const { workflows, loading, startWorkflow, deleteWorkflow } = useWorkflows();
  const navigate = useNavigate();

  const handleStart = async () => {
    if (!goal.trim()) return;
    setIsStarting(true);
    try {
      const id = await startWorkflow(goal.trim());
      setGoal('');
      navigate(`/workflow/${id}`);
    } catch (e) { console.error(e); }
    setIsStarting(false);
  };

  const examples = [
    'Research Tesla Q3 earnings and create an executive summary',
    'Analyze market trends for AI startups and generate a report',
    'Plan a product launch marketing campaign with review',
  ];

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10"><Brain className="h-6 w-6 text-primary" /></div>
          <div><h1 className="text-xl font-semibold">Agentic Workflow Platform</h1><p className="text-sm text-muted-foreground">AI agents collaborate to complete complex tasks</p></div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <Card className="mb-8">
          <CardHeader><CardTitle>Start New Workflow</CardTitle><CardDescription>Describe your goal and let AI agents break it down and execute it step by step</CardDescription></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input placeholder="e.g., Research a company and generate a financial report..." value={goal} onChange={(e) => setGoal(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleStart()} className="flex-1" />
              <Button onClick={handleStart} disabled={!goal.trim() || isStarting}>{isStarting ? <><Loader2 className="h-4 w-4 animate-spin" />Starting...</> : <><Play className="h-4 w-4" />Start</>}</Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {examples.map((ex, i) => (<button key={i} onClick={() => setGoal(ex)} className="text-xs px-3 py-1.5 rounded-full bg-muted hover:bg-muted/80 text-muted-foreground transition-colors">{ex.length > 50 ? ex.slice(0, 50) + '...' : ex}</button>))}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Recent Workflows</h2>
          {loading ? (<div className="text-center py-8 text-muted-foreground">Loading...</div>) : workflows.length === 0 ? (
            <Card><CardContent className="py-12 text-center text-muted-foreground">No workflows yet. Start one above!</CardContent></Card>
          ) : (
            <div className="space-y-3">
              {workflows.map((w) => {
                const config = statusConfig[w.status];
                const Icon = config.icon;
                return (
                  <Card key={w.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate(`/workflow/${w.id}`)}>
                    <CardContent className="py-4 flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{w.goal}</p>
                        <p className="text-sm text-muted-foreground">{new Date(w.created_at).toLocaleString()}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={config.color}><Icon className={`h-3 w-3 mr-1 ${w.status === 'running' ? 'animate-spin' : ''}`} />{w.status}</Badge>
                        <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); deleteWorkflow(w.id); }}><Trash2 className="h-4 w-4 text-muted-foreground" /></Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
