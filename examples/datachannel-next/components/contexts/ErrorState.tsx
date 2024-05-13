import React from 'react';

interface ErrorContext {
    isErrVisible: boolean;
    setIsErrVisible: React.Dispatch<React.SetStateAction<boolean>>;
    errorMessage:string;
    setErrorMessage: React.Dispatch<React.SetStateAction<string>>;
}
export const errMsgArr = {
    conErr: "A connection error occured",
    queryErr: "The query is not viable",
    genErr: "An error occured"
};

const ErrorState = {
    isErrVisible: false,
    setIsErrVisible: ()=>{},
    errorMessage: errMsgArr.genErr,
    setErrorMessage: ()=>{}
}

export const ErrorContext = React.createContext<ErrorContext>(ErrorState);
