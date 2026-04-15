from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.authentication import JWTAuthentication

from .serializers import RegisterSerializer, UserSerializer
from .services import RegistrationError, register_parent


class MeView(APIView):
	permission_classes = [IsAuthenticated]

	def get(self, request):
		return Response(UserSerializer(request.user).data)


class RegisterView(APIView):
	permission_classes = [AllowAny]
	authentication_classes = [JWTAuthentication]

	def post(self, request):
		serializer = RegisterSerializer(data=request.data)
		serializer.is_valid(raise_exception=True)
		data = serializer.validated_data
		try:
			result = register_parent(
				email=data["email"],
				password=data["password"],
				full_name=data.get("full_name", ""),
				student_ids=data.get("student_ids") or [],
			)
		except RegistrationError as exc:
			return Response({"detail": str(exc)}, status=400)

		return Response(
			{
				"access": result.access,
				"refresh": result.refresh,
				"user": UserSerializer(result.user).data,
			},
			status=201,
		)
