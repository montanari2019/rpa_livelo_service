export type ProcessQueueRoutineMessages = {
    order: number;
    message: string;
}[];

export type ProcessQueueRoutineResponse = {
    success: boolean;
    step_title: string;
    messages: ProcessQueueRoutineMessages;
};

export type LiveloCredentialsType = {
    userName: string;
    password: string;
};

export type ExtratTransactionType = {
    data: string
    operacao: string
    parceiros: string
    pontos: number
    observacoes: string
};
