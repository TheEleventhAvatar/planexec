import { useParams, useNavigate } from 'react-router-dom';
import { useWorkflow } from '@/hooks/use-workflow';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ArrowLeft, Brain, Search, Zap, CheckCircle, Database, Clock, Loader2, XCircle, RotateCcw } from 'lucide-react';
import type { AgentType, StepStatus } from '@/types/workflow';
import { AGENT_CONFIGS } from '@/types/workflow';

const agentIcons: Record<AgentType, typeof Brain> = { planner: Brain, research: Search, execution: Zap, critic: CheckCircle, memory: Database };
const statusStyles: Record<StepStatus, { bg: string; text: string; icon: typeof Clock }> = {
  pending: { bg: 'bg-muted', text: 'text-muted-foreground', icon: Clock },
  running: { bg: 'bg-blue-100', text: 'text-blue-700', icon: Loader2 },
  completed: { bg: 'bg-green-100', text: 'text-green-700', icon: CheckCircle },
  failed: { bg: 'bg-red-100', text: 'text-red-700', icon: XCircle },
  retrying: { bg: 'bg-amber-100', text: 'text-amber-700', icon: RotateCcw },
};

export default function WorkflowDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { workflow, steps, messages, loading } = useWorkflow(id || null);

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  if (!workflow) return <div className="min-h-screen flex items-center justify-center flex-col gap-4"><p>Workflow not found</p><Button onClick={() => navigate('/')}>Go Back</Button></div>;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card sticky top-0 z-10">
        <div className="container mx-auto px-4 py-3 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/')}><ArrowLeft className="h-5 w-5" /></Button>
          <div className="flex-1 min-w-0"><h1 className="font-semibold truncate">{workflow.goal}</h1><p className="text-sm text-muted-foreground">Started {new Date(workflow.created_at).toLocaleString()}</p></div>
          <Badge className={workflow.status === 'running' ? 'bg-blue-100 text-blue-700' : workflow.status === 'completed' ? 'bg-green-100 text-green-700' : workflow.status === 'failed' ? 'bg-red-100 text-red-700' : 'bg-muted'}>{workflow.status}</Badge>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <h2 className="font-semibold">Execution Timeline</h2>
          <div className="relative">
            <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-border" />
            {steps.map((step, i) => {
              const Icon = agentIcons[step.agent_type];
              const config = AGENT_CONFIGS[step.agent_type];
              const style = statusStyles[step.status];
              const StatusIcon = style.icon;
              return (
                <div key={step.id} className="relative pl-14 pb-6">
                  <div className={`absolute left-4 w-5 h-5 rounded-full flex items-center justify-center ${style.bg}`}><StatusIcon className={`h-3 w-3 ${style.text} ${step.status === 'running' ? 'animate-spin' : ''}`} /></div>
                  <Card><CardHeader className="py-3 px-4"><div className="flex items-center justify-between"><div className="flex items-center gap-2"><Icon className={`h-4 w-4 ${config.color}`} /><CardTitle className="text-sm">{step.name}</CardTitle></div><Badge variant="outline" className="text-xs">{config.name}</Badge></div></CardHeader>
                    {(step.output || step.error_message) && (<CardContent className="py-3 px-4 border-t">
                      {step.error_message && <p className="text-sm text-red-600">{step.error_message}</p>}
                      {step.output && <pre className="text-xs bg-muted p-2 rounded overflow-auto max-h-40">{JSON.stringify(step.output, null, 2)}</pre>}
                    </CardContent>)}
                  </Card>
                </div>
              );
            })}
          </div>
        </div>

        <div className="space-y-4">
          <h2 className="font-semibold">Agent Messages</h2>
          <Card><ScrollArea className="h-[500px]"><CardContent className="p-4 space-y-3">
            {messages.length === 0 ? <p className="text-sm text-muted-foreground text-center py-4">No messages yet</p> : messages.map((msg) => {
              const config = AGENT_CONFIGS[msg.agent_type];
              return (<div key={msg.id} className="text-sm border-b pb-2 last:border-0"><div className="flex items-center gap-2 mb-1"><Badge variant="outline" className="text-xs">{config.name}</Badge><span className="text-xs text-muted-foreground">{new Date(msg.created_at).toLocaleTimeString()}</span></div><p className="text-muted-foreground">{(msg.content as { message?: string })?.message || msg.message_type}</p></div>);
            })}
          </CardContent></ScrollArea></Card>
        </div>
      </main>
    </div>
  );
}
