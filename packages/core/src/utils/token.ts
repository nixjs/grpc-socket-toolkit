import jwtDecode, { JwtPayload } from 'jwt-decode'

export const isTokenExpired = (token: string): boolean => {
    try {
        const d = jwtDecode(token)
        if (!d) throw new Error('Can not decode token')
        const { exp } = d as JwtPayload
        if (!exp) throw new Error('Token expired')
        return Number(exp) * 1000 < Date.now()
    } catch (error) {
        return true
    }
}
