from rest_framework import serializers

from .models import Announcement


class AnnouncementSerializer(serializers.ModelSerializer):
    class Meta:
        model = Announcement
        fields = (
            "id",
            "school_class",
            "title",
            "message",
            "event_date",
            "created_by",
            "created_at",
        )
        read_only_fields = ("id", "created_by", "created_at")
