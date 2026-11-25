import { useState } from 'react';
import { DndContext, DragOverlay, PointerSensor, useDraggable, useDroppable, useSensor, useSensors } from '@dnd-kit/core';
import { CLOSED_STATUSES, OPEN_STATUSES, STATUS } from '../../utils/format';
import OrderCard from './OrderCard';

function Column({ status, orders, onOpen, onEdit, onStatusChange }) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  const s = STATUS[status];
  return (
    <section
      ref={setNodeRef}
      className={`flex min-h-44 flex-col rounded-xl border p-2.5 transition ${isOver ? 'border-blue-400 bg-blue-50/70' : 'border-slate-200 bg-slate-100/60'}`}
    >
      <header className="mb-2 flex items-center justify-between px-1">
        <span className="flex items-center gap-2 text-sm font-bold text-slate-700">
          <i className={`h-2.5 w-2.5 rounded-full ${s.bar}`} /> {s.label}
        </span>
        <span className="rounded-full bg-white px-2 text-xs font-bold text-slate-500 ring-1 ring-slate-200">{orders.length}</span>
      </header>
      <div className="flex max-h-[62vh] flex-col gap-2 overflow-y-auto pr-0.5">
        {orders.map((o) => <DraggableCard key={o.id} order={o} onOpen={onOpen} onEdit={onEdit} onStatusChange={onStatusChange} />)}
        {orders.length === 0 && <p className="py-6 text-center text-xs text-slate-400">Nenhuma OS</p>}
      </div>
    </section>
  );
}

function DraggableCard({ order, onOpen, onEdit, onStatusChange }) {
  const finished = CLOSED_STATUSES.includes(order.status);
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: order.id, data: { order }, disabled: finished });
  return (
    <div ref={setNodeRef} {...listeners} {...attributes} className={`${finished ? '' : 'cursor-grab active:cursor-grabbing'} ${isDragging ? 'opacity-30' : ''}`}>
      <OrderCard order={order} onOpen={onOpen} onEdit={onEdit} onStatusChange={onStatusChange} />
    </div>
  );
}

// statuses: colunas exibidas. Na Central de OSs (não entregues) só as abertas.
export default function KanbanView({ orders, onOpen, onEdit, onStatusChange, statuses = OPEN_STATUSES }) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));
  const [active, setActive] = useState(null);
  const by = (status) => orders.filter((o) => o.status === status);

  const handleEnd = ({ active: a, over }) => {
    setActive(null);
    if (!over) return;
    const order = a.data.current.order;
    if (over.id !== order.status) onStatusChange(order, over.id);
  };

  return (
    <DndContext sensors={sensors} onDragStart={({ active: a }) => setActive(a.data.current.order)} onDragEnd={handleEnd} onDragCancel={() => setActive(null)}>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {statuses.map((s) => <Column key={s} status={s} orders={by(s)} onOpen={onOpen} onEdit={onEdit} onStatusChange={onStatusChange} />)}
      </div>
      <DragOverlay>
        {active ? <OrderCard order={active} onStatusChange={() => {}} className="rotate-1 shadow-pop" /> : null}
      </DragOverlay>
    </DndContext>
  );
}
