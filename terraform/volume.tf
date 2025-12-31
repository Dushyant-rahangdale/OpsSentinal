resource "aws_ebs_volume" "postgres_data" {
  availability_zone = var.availability_zone
  size              = 10
  type              = "gp3"
  encrypted         = true

  tags = {
    Name = "${var.project_name}-postgres-data"
  }
}
