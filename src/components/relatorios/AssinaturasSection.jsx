import React from 'react';

export const AssinaturasPage = ({ assinaturas }) => {
    if (!assinaturas || assinaturas.length === 0) return null;
    
    return (
        <div className="p-4">
            <h2 className="text-xl font-bold text-center mb-4 bg-blue-900 text-white p-2">Assinaturas</h2>
            <div className="space-y-6 mt-8">
            {assinaturas.map((assinatura, index) => (
                <div key={index} className="flex flex-col items-center">
                    <div className="mb-2 border-b-2 border-black w-64 h-24 flex items-end justify-center">
                        {assinatura.assinatura_imagem && (
                            <img 
                                src={assinatura.assinatura_imagem} 
                                alt="Assinatura" 
                                className="max-h-20 max-w-full object-contain"
                                style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact', colorAdjust: 'exact' }}
                            />
                        )}
                    </div>
                    <div className="text-center">
                        <p className="font-bold" style={{ fontSize: '12px' }}>{assinatura.nome}</p>
                        {assinatura.parte && (
                            <p className="text-gray-600" style={{ fontSize: '12px' }}>{assinatura.parte}</p>
                        )}
                    </div>
                </div>
            ))}
            </div>
        </div>
    );
};