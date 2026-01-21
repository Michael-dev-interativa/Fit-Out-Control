import React from 'react';
import { format } from 'date-fns';

const ReportHeader = ({ vistoria, unidade, empreendimento }) => {
  const logoUrl = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/f1e898ee3_logo_Interativa_versao_final_sem_fundo_0002.png";
  
  return (
    <header className="flex justify-between items-start pb-4 border-b-2 border-gray-200">
      <img src={logoUrl} alt="Interativa Engenharia" className="h-12" />
      <div className="text-right">
        <h1 className="text-sm font-bold text-gray-800">
          RELATÓRIO DE VISTORIA DE OBRA
        </h1>
        <p className="text-xs text-gray-600">
          {empreendimento?.nome_empreendimento} - {unidade?.unidade_empreendimento}
        </p>
        <p className="text-xs text-gray-600">
          {format(new Date(vistoria?.data_vistoria || Date.now()), 'dd/MM/yyyy')}
        </p>
      </div>
    </header>
  );
};

const ReportFooter = ({ currentPage, totalPages }) => (
  <footer className="pt-4 border-t-2 border-gray-200 text-xs text-gray-500 flex justify-between items-center">
    <div className="text-left">
      <p className="font-bold">INTERATIVA ENGENHARIA</p>
      <p>www.interativaengenharia.com.br</p>
      <p>contato@interativaengenharia.com.br</p>
    </div>
    <div className="text-right">
      <p>Página {currentPage} de {totalPages}</p>
    </div>
  </footer>
);

export default function ReportLayout({ children, currentPage, totalPages, vistoria, unidade, empreendimento }) {
  return (
    <div className="flex flex-col h-full p-8 font-sans">
      <ReportHeader
        vistoria={vistoria}
        unidade={unidade}
        empreendimento={empreendimento}
      />
      <main className="flex-grow py-4">
        {children}
      </main>
      <ReportFooter
        currentPage={currentPage}
        totalPages={totalPages}
      />
    </div>
  );
}