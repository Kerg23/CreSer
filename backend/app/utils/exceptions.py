class BusinessException(Exception):
    """Excepción para errores de lógica de negocio"""
    def __init__(self, message: str):
        self.message = message
        super().__init__(self.message)

class AuthenticationException(Exception):
    """Excepción para errores de autenticación"""
    def __init__(self, message: str):
        self.message = message
        super().__init__(self.message)

class AuthorizationException(Exception):
    """Excepción para errores de autorización"""
    def __init__(self, message: str):
        self.message = message
        super().__init__(self.message)

class ValidationException(Exception):
    """Excepción para errores de validación"""
    def __init__(self, message: str):
        self.message = message
        super().__init__(self.message)
