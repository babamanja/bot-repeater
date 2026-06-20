import { useState } from "react";

function useRequestState() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return { isLoading, setIsLoading, error, setError };
}

export default useRequestState;
